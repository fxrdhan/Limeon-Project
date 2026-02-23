import { supabase } from '@/lib/supabase';
import type { ServiceResponse } from './base.service';
import type { PostgrestError } from '@supabase/supabase-js';

interface ReplaceLinkedItemsParams<TItem extends Record<string, unknown>> {
  tableName: string;
  foreignKey: string;
  parentId: string;
  items: TItem[];
}

interface FetchRecordWithItemsParams {
  parentTable: string;
  parentId: string;
  parentSelect?: string;
  itemsTable: string;
  itemsForeignKey: string;
  itemsSelect?: string;
}

interface DateRangeQueryParams {
  tableName: string;
  select: string;
  startDate: string;
  endDate: string;
  dateColumn?: string;
  orderColumn?: string;
  ascending?: boolean;
}

export async function replaceLinkedItems<TItem extends Record<string, unknown>>(
  params: ReplaceLinkedItemsParams<TItem>
): Promise<ServiceResponse<TItem[]>> {
  const { tableName, foreignKey, parentId, items } = params;

  try {
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq(foreignKey, parentId);

    if (deleteError) {
      return { data: null, error: deleteError };
    }

    if (items.length === 0) {
      return { data: [], error: null };
    }

    const payload = items.map(item => ({
      ...item,
      [foreignKey]: parentId,
    }));

    const { data, error } = await supabase
      .from(tableName)
      .insert(payload)
      .select('*');

    if (error) {
      return { data: null, error };
    }

    return { data: (data || []) as TItem[], error: null };
  } catch (error) {
    return { data: null, error: error as PostgrestError };
  }
}

export async function fetchRecordWithItems<TRecord, TItem>(
  params: FetchRecordWithItemsParams
): Promise<ServiceResponse<{ record: TRecord; items: TItem[] }>> {
  const {
    parentTable,
    parentId,
    parentSelect = '*',
    itemsTable,
    itemsForeignKey,
    itemsSelect = '*',
  } = params;

  try {
    const { data: record, error: recordError } = await supabase
      .from(parentTable)
      .select(parentSelect)
      .eq('id', parentId)
      .single();

    if (recordError || !record) {
      return { data: null, error: recordError };
    }

    const { data: items, error: itemsError } = await supabase
      .from(itemsTable)
      .select(itemsSelect)
      .eq(itemsForeignKey, parentId);

    if (itemsError) {
      return { data: null, error: itemsError };
    }

    return {
      data: {
        record: record as TRecord,
        items: (items || []) as TItem[],
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as PostgrestError };
  }
}

export async function isUniqueByColumn(
  tableName: string,
  columnName: string,
  value: string,
  excludeId?: string
): Promise<boolean> {
  try {
    let query = supabase.from(tableName).select('id').eq(columnName, value);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;
    if (error) {
      console.error(`Error checking unique value on ${tableName}:`, error);
      return false;
    }

    return !data || data.length === 0;
  } catch {
    return false;
  }
}

export async function getRecordsByDateRange<TRecord>(
  params: DateRangeQueryParams
): Promise<ServiceResponse<TRecord[]>> {
  const {
    tableName,
    select,
    startDate,
    endDate,
    dateColumn = 'date',
    orderColumn = 'date',
    ascending = false,
  } = params;

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select(select)
      .gte(dateColumn, startDate)
      .lte(dateColumn, endDate)
      .order(orderColumn, { ascending });

    return {
      data: (data || []) as TRecord[],
      error,
    };
  } catch (error) {
    return { data: null, error: error as PostgrestError };
  }
}
