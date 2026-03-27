import { BaseService, ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
import type { PurchaseData, PurchaseItem } from '@/types/purchase';
import type { PostgrestError } from '@supabase/supabase-js';
import {
  fetchRecordWithItems,
  getRecordsByDateRange,
  isUniqueByColumn,
  replaceLinkedItems,
} from './transaction.helpers';
import {
  applyStockUpdates,
  buildStockUpdates,
  updateRecordWithLinkedItems,
} from './transaction.base';

interface DBPurchase {
  id: string;
  invoice_number: string;
  supplier_id: string;
  date: string;
  due_date: string | null;
  total: number;
  payment_status: string;
  payment_method: string;
  vat_percentage: number;
  is_vat_included: boolean;
  vat_amount: number;
  notes: string | null;
  customer_name?: string;
  customer_address?: string;
  checked_by?: string;
  created_at?: string;
  updated_at?: string | null;
}

interface DBPurchaseItem {
  id: string;
  purchase_id: string;
  item_id: string;
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
  unit: string;
  unit_id?: string | null;
  vat_percentage: number;
  batch_no: string | null;
  expiry_date: string | null;
  unit_conversion_rate?: number;
  created_at?: string;
}

export interface PurchaseListItem {
  id: string;
  invoice_number: string;
  date: string;
  total: number;
  payment_status: string;
  payment_method: string;
  supplier: { name: string } | null;
}

export class PurchasesService extends BaseService<DBPurchase> {
  constructor() {
    super('purchases');
  }

  async getPaginatedPurchases(params: {
    page: number;
    limit: number;
    searchTerm?: string;
  }): Promise<
    ServiceResponse<{ purchases: PurchaseListItem[]; totalItems: number }>
  > {
    try {
      const { page, limit, searchTerm } = params;

      let query = supabase.from('purchases').select(`
          id,
          invoice_number,
          date,
          total,
          payment_status,
          payment_method,
          supplier_id,
          supplier:suppliers(name)
        `);

      let countQuery = supabase
        .from('purchases')
        .select('id', { count: 'exact' });

      if (searchTerm) {
        query = query.ilike('invoice_number', `%${searchTerm}%`);
        countQuery = countQuery.ilike('invoice_number', `%${searchTerm}%`);
      }

      const { count, error: countError } = await countQuery;
      if (countError) {
        return { data: null, error: countError };
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error } = await query
        .order('date', { ascending: false })
        .range(from, to);

      if (error) {
        return { data: null, error };
      }

      const purchases =
        data?.map(item => ({
          ...item,
          supplier: Array.isArray(item.supplier)
            ? item.supplier[0]
            : item.supplier,
        })) || [];

      return { data: { purchases, totalItems: count || 0 }, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Get all purchases with supplier data
  async getAllWithSuppliers(
    options: Parameters<BaseService<DBPurchase>['getAll']>[0] = {}
  ) {
    const defaultSelect = `
      *,
      suppliers (
        id,
        name,
        address,
        contact_person,
        phone,
        email
      )
    `;

    return super.getAll({
      ...options,
      select: options.select || defaultSelect,
    });
  }

  // Get purchase with full details
  async getPurchaseWithDetails(
    id: string
  ): Promise<ServiceResponse<PurchaseData>> {
    try {
      const { data: purchase, error } = await supabase
        .from('purchases')
        .select(
          `
          *,
          suppliers (
            id,
            name,
            address,
            contact_person,
            phone,
            email
          )
        `
        )
        .eq('id', id)
        .single();

      if (error || !purchase) {
        return { data: null, error };
      }

      // Transform to PurchaseData
      const transformedPurchase: PurchaseData = {
        ...purchase,
        supplier: {
          name: purchase.suppliers?.name || '',
          address: purchase.suppliers?.address || null,
          contact_person: purchase.suppliers?.contact_person || null,
        },
      };

      return { data: transformedPurchase, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Get purchase items
  async getPurchaseItems(
    purchaseId: string
  ): Promise<ServiceResponse<PurchaseItem[]>> {
    try {
      const { data, error } = await supabase
        .from('purchase_items')
        .select(
          `
          *,
          items (
            id,
            name,
            code,
            manufacturer
          )
        `
        )
        .eq('purchase_id', purchaseId)
        .order('created_at', { ascending: true });

      if (error || !data) {
        return { data: null, error };
      }

      // Transform to PurchaseItem
      const transformedItems: PurchaseItem[] = data.map(item => ({
        ...item,
        item_name: item.items?.name || '',
        item: {
          name: item.items?.name || '',
          code: item.items?.code || '',
        },
        unit_id: item.unit_id ?? null,
        unit_conversion_rate: Number(item.unit_conversion_rate) || 1,
      }));

      return { data: transformedItems, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Create purchase with items
  async createPurchaseWithItems(
    purchaseData: Omit<DBPurchase, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<DBPurchaseItem, 'id' | 'purchase_id' | 'created_at'>[]
  ): Promise<
    ServiceResponse<{ purchase: DBPurchase; items: DBPurchaseItem[] }>
  > {
    try {
      const purchaseItems = items.map(item => ({
        item_id: item.item_id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        discount: item.discount,
        vat_percentage: item.vat_percentage,
        unit: item.unit,
        unit_id: item.unit_id ?? null,
        unit_conversion_rate: item.unit_conversion_rate ?? 1,
        batch_no: item.batch_no,
        expiry_date: item.expiry_date,
      }));

      const { data: purchaseId, error: purchaseError } = await supabase.rpc(
        'process_purchase_v2',
        {
          p_supplier_id: purchaseData.supplier_id || null,
          p_invoice_number: purchaseData.invoice_number,
          p_date: purchaseData.date,
          p_total: purchaseData.total,
          p_payment_status: purchaseData.payment_status,
          p_payment_method: purchaseData.payment_method,
          p_notes: purchaseData.notes || null,
          p_due_date: purchaseData.due_date || null,
          p_vat_amount: purchaseData.vat_amount,
          p_vat_percentage: purchaseData.vat_percentage,
          p_is_vat_included: purchaseData.is_vat_included,
          p_customer_name: purchaseData.customer_name || null,
          p_customer_address: purchaseData.customer_address || null,
          p_items: purchaseItems,
        }
      );

      if (purchaseError || !purchaseId) {
        return { data: null, error: purchaseError };
      }

      const result = await fetchRecordWithItems<DBPurchase, DBPurchaseItem>({
        parentTable: 'purchases',
        parentId: purchaseId,
        itemsTable: 'purchase_items',
        itemsForeignKey: 'purchase_id',
      });

      if (result.error || !result.data) {
        return { data: null, error: result.error };
      }

      return {
        data: {
          purchase: result.data.record,
          items: result.data.items,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Update purchase with items
  async updatePurchaseWithItems(
    id: string,
    purchaseData: Partial<Omit<DBPurchase, 'id' | 'created_at'>>,
    items?: Omit<DBPurchaseItem, 'id' | 'purchase_id' | 'created_at'>[]
  ): Promise<
    ServiceResponse<{ purchase: DBPurchase; items?: DBPurchaseItem[] }>
  > {
    const result = await updateRecordWithLinkedItems<
      DBPurchase,
      PurchaseItem,
      Omit<DBPurchaseItem, 'id' | 'purchase_id' | 'created_at'>,
      Omit<DBPurchaseItem, 'id' | 'purchase_id' | 'created_at'>
    >({
      updateRecord: () => this.update(id, purchaseData),
      nextItems: items,
      fetchExistingItems: () => this.getPurchaseItems(id),
      replaceItems: nextItems =>
        replaceLinkedItems({
          tableName: 'purchase_items',
          foreignKey: 'purchase_id',
          parentId: id,
          items: nextItems,
        }),
      recalculateStockDifferences: (oldItems, newItems) =>
        this.recalculateStockDifferences(oldItems, newItems),
    });

    if (result.error || !result.data) {
      return { data: null, error: result.error };
    }

    return {
      data: {
        purchase: result.data.record,
        items: result.data.items as DBPurchaseItem[] | undefined,
      },
      error: null,
    };
  }

  // Delete purchase and restore stocks
  async deletePurchaseWithStockRestore(
    id: string
  ): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase.rpc(
        'delete_purchase_with_stock_restore',
        {
          p_purchase_id: id,
        }
      );

      return { data: null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Get purchases by supplier
  async getPurchasesBySupplier(supplierId: string) {
    return this.getAllWithSuppliers({
      filters: { supplier_id: supplierId },
      orderBy: { column: 'date', ascending: false },
    });
  }

  // Get purchases by payment status
  async getPurchasesByPaymentStatus(status: string) {
    return this.getAllWithSuppliers({
      filters: { payment_status: status },
      orderBy: { column: 'date', ascending: false },
    });
  }

  // Get purchases by date range
  async getPurchasesByDateRange(startDate: string, endDate: string) {
    return getRecordsByDateRange<PurchaseData>({
      tableName: 'purchases',
      select: `
          *,
          suppliers (
            id,
            name,
            address,
            contact_person
          )
        `,
      startDate,
      endDate,
    });
  }

  // Check if invoice number exists
  async isInvoiceNumberUnique(
    invoiceNumber: string,
    excludeId?: string
  ): Promise<boolean> {
    return isUniqueByColumn(
      'purchases',
      'invoice_number',
      invoiceNumber,
      excludeId
    );
  }

  private async updateItemStocks(updates: { id: string; increment: number }[]) {
    await applyStockUpdates(updates);
  }

  private async recalculateStockDifferences(
    oldItems: PurchaseItem[],
    newItems: Omit<DBPurchaseItem, 'id' | 'purchase_id' | 'created_at'>[]
  ) {
    const updates = buildStockUpdates({
      oldItems,
      newItems,
      getOldDelta: item => ({
        itemId: item.item_id,
        delta: -item.quantity * (item.unit_conversion_rate ?? 1),
      }),
      getNewDelta: item => ({
        itemId: item.item_id,
        delta: item.quantity * (item.unit_conversion_rate ?? 1),
      }),
    });

    await this.updateItemStocks(updates);
  }
}

export const purchasesService = new PurchasesService();
