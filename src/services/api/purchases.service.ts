import { BaseService, ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
import type { PurchaseData, PurchaseItem } from '@/types/purchase';
import type { PostgrestError } from '@supabase/supabase-js';

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
  vat_percentage: number;
  batch_no: string | null;
  expiry_date: string | null;
  unit_conversion_rate: number;
  created_at?: string;
}

export class PurchasesService extends BaseService<DBPurchase> {
  constructor() {
    super('purchases');
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
      // Start a transaction
      const { data: purchase, error: purchaseError } = await supabase
        .from('purchases')
        .insert(purchaseData)
        .select()
        .single();

      if (purchaseError || !purchase) {
        return { data: null, error: purchaseError };
      }

      // Insert purchase items
      const purchaseItems = items.map(item => ({
        ...item,
        purchase_id: purchase.id,
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from('purchase_items')
        .insert(purchaseItems)
        .select();

      if (itemsError) {
        // Rollback by deleting the purchase
        await supabase.from('purchases').delete().eq('id', purchase.id);
        return { data: null, error: itemsError };
      }

      // Update item stocks
      const stockUpdates = items.map(item => ({
        id: item.item_id,
        increment: item.quantity * item.unit_conversion_rate,
      }));

      await this.updateItemStocks(stockUpdates);

      return {
        data: { purchase, items: insertedItems || [] },
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
    try {
      // Update purchase
      const { data: purchase, error: purchaseError } = await this.update(
        id,
        purchaseData
      );

      if (purchaseError || !purchase) {
        return { data: null, error: purchaseError };
      }

      if (items) {
        // Get existing items to calculate stock differences
        const { data: existingItems } = await this.getPurchaseItems(id);

        // Delete existing items
        await supabase.from('purchase_items').delete().eq('purchase_id', id);

        // Insert new items
        const purchaseItems = items.map(item => ({
          ...item,
          purchase_id: id,
        }));

        const { data: insertedItems, error: itemsError } = await supabase
          .from('purchase_items')
          .insert(purchaseItems)
          .select();

        if (itemsError) {
          return { data: null, error: itemsError };
        }

        // Update stock based on differences
        await this.recalculateStockDifferences(existingItems || [], items);

        return {
          data: { purchase, items: insertedItems || [] },
          error: null,
        };
      }

      return { data: { purchase }, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Delete purchase and restore stocks
  async deletePurchaseWithStockRestore(
    id: string
  ): Promise<ServiceResponse<null>> {
    try {
      // Get purchase items first
      const { data: items } = await this.getPurchaseItems(id);

      if (items && items.length > 0) {
        // Restore stocks
        const stockUpdates = items.map(item => ({
          id: item.item_id,
          increment: -(item.quantity * item.unit_conversion_rate),
        }));

        await this.updateItemStocks(stockUpdates);
      }

      // Delete purchase (cascade will delete items)
      return this.delete(id);
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
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select(
          `
          *,
          suppliers (
            id,
            name,
            address,
            contact_person
          )
        `
        )
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      return { data, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Check if invoice number exists
  async isInvoiceNumberUnique(
    invoiceNumber: string,
    excludeId?: string
  ): Promise<boolean> {
    try {
      let query = supabase
        .from('purchases')
        .select('id')
        .eq('invoice_number', invoiceNumber);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error checking invoice uniqueness:', error);
        return false;
      }

      return !data || data.length === 0;
    } catch {
      return false;
    }
  }

  // Private helper methods
  private async updateItemStocks(updates: { id: string; increment: number }[]) {
    try {
      for (const update of updates) {
        const { data: item } = await supabase
          .from('items')
          .select('stock')
          .eq('id', update.id)
          .single();

        if (item) {
          await supabase
            .from('items')
            .update({ stock: item.stock + update.increment })
            .eq('id', update.id);
        }
      }
    } catch (error) {
      console.error('Error updating item stocks:', error);
    }
  }

  private async recalculateStockDifferences(
    oldItems: PurchaseItem[],
    newItems: Omit<DBPurchaseItem, 'id' | 'purchase_id' | 'created_at'>[]
  ) {
    const stockMap = new Map<string, number>();

    // Calculate old stock impact
    oldItems.forEach(item => {
      const currentValue = stockMap.get(item.item_id) || 0;
      stockMap.set(
        item.item_id,
        currentValue - item.quantity * item.unit_conversion_rate
      );
    });

    // Calculate new stock impact
    newItems.forEach(item => {
      const currentValue = stockMap.get(item.item_id) || 0;
      stockMap.set(
        item.item_id,
        currentValue + item.quantity * item.unit_conversion_rate
      );
    });

    // Apply stock differences
    const updates = Array.from(stockMap.entries())
      .filter(([, increment]) => increment !== 0)
      .map(([id, increment]) => ({ id, increment }));

    await this.updateItemStocks(updates);
  }
}

export const purchasesService = new PurchasesService();
