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
import {
  calculateSalesAnalytics,
  buildSaleRpcItems,
  mapSaleItemWithDetails,
  mapSalesListItem,
  mapSaleWithDetails,
} from './sales.mappers';
import {
  SALE_DETAILS_SELECT,
  SALES_DATE_RANGE_SELECT,
  SALES_LIST_SELECT,
} from './sales.selects';
import type {
  DBSale,
  DBSaleItem,
  SaleCreateInput,
  SaleItemInput,
  SaleItemWithDetails,
  SalesListItem,
  SaleUpdateInput,
  SaleWithDetails,
} from './sales.types';

export type { SalesListItem } from './sales.types';

export class SalesService extends BaseService<DBSale> {
  constructor() {
    super('sales');
  }

  async getPaginatedSales(params: {
    page: number;
    limit: number;
    searchTerm?: string;
  }): Promise<ServiceResponse<{ sales: SalesListItem[]; totalItems: number }>> {
    try {
      const { page, limit, searchTerm } = params;
      let query = supabase.from('sales').select(SALES_LIST_SELECT);
      let countQuery = supabase.from('sales').select('id', { count: 'exact' });

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

      return {
        data: {
          sales: data?.map(mapSalesListItem) || [],
          totalItems: count || 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async getAllWithDetails(
    options: Parameters<BaseService<DBSale>['getAll']>[0] = {}
  ): Promise<ServiceResponse<SaleWithDetails[]>> {
    try {
      const result = await super.getAll({
        ...options,
        select: options.select || SALE_DETAILS_SELECT,
      });

      if (result.error || !result.data) {
        return { data: null, error: result.error };
      }

      return {
        data: result.data.map(mapSaleWithDetails),
        error: null,
        count: result.count,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async getSaleWithDetails(
    id: string
  ): Promise<ServiceResponse<SaleWithDetails>> {
    try {
      const { data: sale, error } = await supabase
        .from('sales')
        .select(SALE_DETAILS_SELECT)
        .eq('id', id)
        .single();

      if (error || !sale) {
        return { data: null, error };
      }

      return { data: mapSaleWithDetails(sale), error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

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

      return {
        data: data.map(item =>
          mapSaleItemWithDetails(
            item as Parameters<typeof mapSaleItemWithDetails>[0]
          )
        ),
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

  async createSaleWithItems(
    saleData: SaleCreateInput,
    items: SaleItemInput[]
  ): Promise<ServiceResponse<{ sale: DBSale; items: DBSaleItem[] }>> {
    try {
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
          p_items: buildSaleRpcItems(items),
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

  async updateSaleWithItems(
    id: string,
    saleData: SaleUpdateInput,
    items?: SaleItemInput[]
  ): Promise<ServiceResponse<{ sale: DBSale; items?: DBSaleItem[] }>> {
    const result = await updateRecordWithLinkedItems<
      DBSale,
      SaleItemWithDetails,
      SaleItemInput,
      SaleItemInput
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

  async getSalesByPatient(patientId: string) {
    return this.getAllWithDetails({
      filters: { patient_id: patientId },
      orderBy: { column: 'date', ascending: false },
    });
  }

  async getSalesByDoctor(doctorId: string) {
    return this.getAllWithDetails({
      filters: { doctor_id: doctorId },
      orderBy: { column: 'date', ascending: false },
    });
  }

  async getSalesByDateRange(startDate: string, endDate: string) {
    return getRecordsByDateRange<SaleWithDetails>({
      tableName: 'sales',
      select: SALES_DATE_RANGE_SELECT,
      startDate,
      endDate,
    });
  }

  async getSalesByPaymentMethod(paymentMethod: string) {
    return this.getAllWithDetails({
      filters: { payment_method: paymentMethod },
      orderBy: { column: 'date', ascending: false },
    });
  }

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

      return {
        data: calculateSalesAnalytics(data),
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  }

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
    newItems: SaleItemInput[]
  ) {
    const updates = buildStockUpdates({
      oldItems,
      newItems,
      getOldDelta: item => ({
        itemId: item.item_id,
        delta: item.quantity * (item.unit_conversion_rate ?? 1),
      }),
      getNewDelta: item => ({
        itemId: item.item_id,
        delta: -item.quantity * (item.unit_conversion_rate ?? 1),
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
