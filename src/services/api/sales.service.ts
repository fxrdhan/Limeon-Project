import { BaseService, ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
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

interface DBSale {
  id: string;
  patient_id?: string;
  doctor_id?: string;
  customer_id?: string;
  invoice_number?: string;
  date: string;
  total: number;
  payment_method: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface DBSaleItem {
  id: string;
  sale_id: string;
  item_id: string;
  quantity: number;
  price: number;
  subtotal: number;
  unit_name?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface SaleWithDetails {
  id: string;
  patient_id?: string;
  doctor_id?: string;
  invoice_number?: string;
  date: string;
  total: number;
  payment_method: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  patient?: {
    id: string;
    name: string;
    phone?: string;
  };
  doctor?: {
    id: string;
    name: string;
    specialization?: string;
  };
  created_by_user?: {
    id: string;
    name: string;
  };
}

interface SaleItemWithDetails {
  id: string;
  sale_id: string;
  item_id: string;
  quantity: number;
  price: number;
  subtotal: number;
  created_at?: string;
  updated_at?: string;
  item: {
    id: string;
    name: string;
    code?: string;
    manufacturer?: string;
  };
}

export class SalesService extends BaseService<DBSale> {
  constructor() {
    super('sales');
  }

  // Get all sales with related data
  async getAllWithDetails(
    options: Parameters<BaseService<DBSale>['getAll']>[0] = {}
  ): Promise<ServiceResponse<SaleWithDetails[]>> {
    try {
      const defaultSelect = `
        *,
        patients (
          id,
          name,
          phone
        ),
        doctors (
          id,
          name,
          specialization
        ),
        users!sales_created_by_fkey (
          id,
          name
        )
      `;

      const result = await super.getAll({
        ...options,
        select: options.select || defaultSelect,
      });

      if (result.error || !result.data) {
        return { data: null, error: result.error };
      }

      // Transform data
      const transformedData = result.data.map((sale: unknown) => {
        const saleData = sale as Record<string, unknown>;
        return {
          ...saleData,
          patient: saleData.patients as
            | { id: string; name: string; phone?: string }
            | undefined,
          doctor: saleData.doctors as
            | { id: string; name: string; specialization?: string }
            | undefined,
          created_by_user: saleData.users as
            | { id: string; name: string }
            | undefined,
        };
      }) as SaleWithDetails[];

      return {
        data: transformedData,
        error: null,
        count: result.count,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Get sale with full details
  async getSaleWithDetails(
    id: string
  ): Promise<ServiceResponse<SaleWithDetails>> {
    try {
      const { data: sale, error } = await supabase
        .from('sales')
        .select(
          `
          *,
          patients (
            id,
            name,
            phone
          ),
          doctors (
            id,
            name,
            specialization
          ),
          users!sales_created_by_fkey (
            id,
            name
          )
        `
        )
        .eq('id', id)
        .single();

      if (error || !sale) {
        return { data: null, error };
      }

      // Transform data
      const transformedSale: SaleWithDetails = {
        ...sale,
        patient: sale.patients,
        doctor: sale.doctors,
        created_by_user: sale.users,
      };

      return { data: transformedSale, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Get sale items
  async getSaleItems(
    saleId: string
  ): Promise<ServiceResponse<SaleItemWithDetails[]>> {
    try {
      const { data, error } = await supabase
        .from('sale_items')
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
        .eq('sale_id', saleId)
        .order('created_at', { ascending: true });

      if (error || !data) {
        return { data: null, error };
      }

      // Transform data
      const transformedItems: SaleItemWithDetails[] = data.map(item => ({
        ...item,
        item: {
          id: item.items?.id || '',
          name: item.items?.name || '',
          code: item.items?.code || '',
          manufacturer: item.items?.manufacturer || '',
        },
      }));

      return { data: transformedItems, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Create sale with items
  async createSaleWithItems(
    saleData: Omit<DBSale, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<DBSaleItem, 'id' | 'sale_id' | 'created_at' | 'updated_at'>[]
  ): Promise<ServiceResponse<{ sale: DBSale; items: DBSaleItem[] }>> {
    try {
      const saleItems = items.map(item => ({
        item_id: item.item_id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        unit_name: item.unit_name,
      }));

      const { data: saleId, error: saleError } = await supabase.rpc(
        'process_sale_v1',
        {
          p_patient_id: saleData.patient_id || null,
          p_doctor_id: saleData.doctor_id || null,
          p_customer_id: saleData.customer_id || null,
          p_invoice_number: saleData.invoice_number || null,
          p_date: saleData.date,
          p_total: saleData.total,
          p_payment_method: saleData.payment_method,
          p_created_by: saleData.created_by || null,
          p_items: saleItems,
        }
      );

      if (saleError || !saleId) {
        return { data: null, error: saleError };
      }

      const result = await fetchRecordWithItems<DBSale, DBSaleItem>({
        parentTable: 'sales',
        parentId: saleId,
        itemsTable: 'sale_items',
        itemsForeignKey: 'sale_id',
      });

      if (result.error || !result.data) {
        return { data: null, error: result.error };
      }

      return {
        data: {
          sale: result.data.record,
          items: result.data.items,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Update sale with items
  async updateSaleWithItems(
    id: string,
    saleData: Partial<Omit<DBSale, 'id' | 'created_at'>>,
    items?: Omit<DBSaleItem, 'id' | 'sale_id' | 'created_at' | 'updated_at'>[]
  ): Promise<ServiceResponse<{ sale: DBSale; items?: DBSaleItem[] }>> {
    const result = await updateRecordWithLinkedItems<
      DBSale,
      SaleItemWithDetails,
      Omit<DBSaleItem, 'id' | 'sale_id' | 'created_at' | 'updated_at'>,
      Omit<DBSaleItem, 'id' | 'sale_id' | 'created_at' | 'updated_at'>
    >({
      updateRecord: () => this.update(id, saleData),
      nextItems: items,
      fetchExistingItems: () => this.getSaleItems(id),
      replaceItems: nextItems =>
        replaceLinkedItems({
          tableName: 'sale_items',
          foreignKey: 'sale_id',
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
        sale: result.data.record,
        items: result.data.items as DBSaleItem[] | undefined,
      },
      error: null,
    };
  }

  // Delete sale and restore stocks
  async deleteSaleWithStockRestore(id: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase.rpc('delete_sale_with_stock_restore', {
        p_sale_id: id,
      });

      return { data: null, error };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Get sales by patient
  async getSalesByPatient(patientId: string) {
    return this.getAllWithDetails({
      filters: { patient_id: patientId },
      orderBy: { column: 'date', ascending: false },
    });
  }

  // Get sales by doctor
  async getSalesByDoctor(doctorId: string) {
    return this.getAllWithDetails({
      filters: { doctor_id: doctorId },
      orderBy: { column: 'date', ascending: false },
    });
  }

  // Get sales by date range
  async getSalesByDateRange(startDate: string, endDate: string) {
    return getRecordsByDateRange<SaleWithDetails>({
      tableName: 'sales',
      select: `
          *,
          patients (
            id,
            name,
            phone
          ),
          doctors (
            id,
            name,
            specialization
          )
        `,
      startDate,
      endDate,
    });
  }

  // Get sales by payment method
  async getSalesByPaymentMethod(paymentMethod: string) {
    return this.getAllWithDetails({
      filters: { payment_method: paymentMethod },
      orderBy: { column: 'date', ascending: false },
    });
  }

  // Get sales analytics
  async getSalesAnalytics(startDate?: string, endDate?: string) {
    try {
      let query = supabase.from('sales').select('date, total, payment_method');

      if (startDate && endDate) {
        query = query.gte('date', startDate).lte('date', endDate);
      }

      const { data, error } = await query;

      if (error || !data) {
        return { data: null, error };
      }

      // Calculate analytics
      const totalRevenue = data.reduce(
        (sum, sale) => sum + Number(sale.total),
        0
      );
      const totalSales = data.length;
      const averageSale = totalSales > 0 ? totalRevenue / totalSales : 0;

      const paymentMethods = data.reduce(
        (acc, sale) => {
          acc[sale.payment_method] =
            (acc[sale.payment_method] || 0) + Number(sale.total);
          return acc;
        },
        {} as Record<string, number>
      );

      return {
        data: {
          totalRevenue,
          totalSales,
          averageSale,
          paymentMethods,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  // Check if invoice number exists
  async isInvoiceNumberUnique(
    invoiceNumber: string,
    excludeId?: string
  ): Promise<boolean> {
    return isUniqueByColumn(
      'sales',
      'invoice_number',
      invoiceNumber,
      excludeId
    );
  }

  private async updateItemStocks(
    updates: { id: string; increment?: number; decrement?: number }[]
  ) {
    const normalizedUpdates = updates
      .map(update => ({
        id: update.id,
        increment: (update.increment || 0) - (update.decrement || 0),
      }))
      .filter(update => update.increment !== 0);

    await applyStockUpdates(normalizedUpdates);
  }

  private async recalculateStockDifferences(
    oldItems: SaleItemWithDetails[],
    newItems: Omit<DBSaleItem, 'id' | 'sale_id' | 'created_at' | 'updated_at'>[]
  ) {
    const updates = buildStockUpdates({
      oldItems,
      newItems,
      getOldDelta: item => ({
        itemId: item.item_id,
        delta: item.quantity,
      }),
      getNewDelta: item => ({
        itemId: item.item_id,
        delta: -item.quantity,
      }),
    });

    await this.updateItemStocks(
      updates.map(update =>
        update.increment > 0
          ? { id: update.id, increment: update.increment }
          : { id: update.id, decrement: Math.abs(update.increment) }
      )
    );
  }
}

export const salesService = new SalesService();
