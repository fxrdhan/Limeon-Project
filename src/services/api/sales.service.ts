import { BaseService, ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

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

      const { data: sale, error: fetchSaleError } = await supabase
        .from('sales')
        .select('*')
        .eq('id', saleId)
        .single();

      if (fetchSaleError || !sale) {
        return { data: null, error: fetchSaleError };
      }

      const { data: insertedItems, error: itemsError } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId);

      if (itemsError) {
        return { data: null, error: itemsError };
      }

      return {
        data: { sale, items: insertedItems || [] },
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
    try {
      // Update sale
      const { data: sale, error: saleError } = await this.update(id, saleData);

      if (saleError || !sale) {
        return { data: null, error: saleError };
      }

      if (items) {
        // Get existing items to calculate stock differences
        const { data: existingItems } = await this.getSaleItems(id);

        // Delete existing items
        await supabase.from('sale_items').delete().eq('sale_id', id);

        // Insert new items
        const saleItems = items.map(item => ({
          ...item,
          sale_id: id,
        }));

        const { data: insertedItems, error: itemsError } = await supabase
          .from('sale_items')
          .insert(saleItems)
          .select();

        if (itemsError) {
          return { data: null, error: itemsError };
        }

        // Update stock based on differences
        await this.recalculateStockDifferences(existingItems || [], items);

        return {
          data: { sale, items: insertedItems || [] },
          error: null,
        };
      }

      return { data: { sale }, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
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
    try {
      const { data, error } = await supabase
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
    try {
      let query = supabase
        .from('sales')
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
  private async updateItemStocks(
    updates: { id: string; increment?: number; decrement?: number }[]
  ) {
    try {
      for (const update of updates) {
        const { data: item } = await supabase
          .from('items')
          .select('stock')
          .eq('id', update.id)
          .single();

        if (item) {
          let newStock = item.stock;
          if (update.increment) {
            newStock += update.increment;
          }
          if (update.decrement) {
            newStock -= update.decrement;
          }

          await supabase
            .from('items')
            .update({ stock: newStock })
            .eq('id', update.id);
        }
      }
    } catch (error) {
      console.error('Error updating item stocks:', error);
    }
  }

  private async recalculateStockDifferences(
    oldItems: SaleItemWithDetails[],
    newItems: Omit<DBSaleItem, 'id' | 'sale_id' | 'created_at' | 'updated_at'>[]
  ) {
    const stockMap = new Map<string, number>();

    // Calculate old stock impact (restore)
    oldItems.forEach(item => {
      const currentValue = stockMap.get(item.item_id) || 0;
      stockMap.set(item.item_id, currentValue + item.quantity);
    });

    // Calculate new stock impact (remove)
    newItems.forEach(item => {
      const currentValue = stockMap.get(item.item_id) || 0;
      stockMap.set(item.item_id, currentValue - item.quantity);
    });

    // Apply stock differences
    const updates = Array.from(stockMap.entries())
      .filter(([, difference]) => difference !== 0)
      .map(([id, difference]) => ({
        id,
        increment: difference > 0 ? difference : undefined,
        decrement: difference < 0 ? Math.abs(difference) : undefined,
      }));

    await this.updateItemStocks(updates);
  }
}

export const salesService = new SalesService();
