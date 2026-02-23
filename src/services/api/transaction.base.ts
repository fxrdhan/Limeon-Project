import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';

export interface StockDeltaUpdate {
  id: string;
  increment: number;
}

interface BuildStockUpdatesParams<TOldItem, TNewItem> {
  oldItems: TOldItem[];
  newItems: TNewItem[];
  getOldDelta: (item: TOldItem) => { itemId: string; delta: number };
  getNewDelta: (item: TNewItem) => { itemId: string; delta: number };
}

interface UpdateRecordWithLinkedItemsParams<
  TRecord,
  TOldItem,
  TNewItem,
  TInsertedItem,
> {
  updateRecord: () => Promise<ServiceResponse<TRecord>>;
  nextItems?: TNewItem[];
  fetchExistingItems: () => Promise<ServiceResponse<TOldItem[]>>;
  replaceItems: (
    items: TNewItem[]
  ) => Promise<ServiceResponse<TInsertedItem[]>>;
  recalculateStockDifferences: (
    oldItems: TOldItem[],
    newItems: TNewItem[]
  ) => Promise<void>;
}

export const buildStockUpdates = <TOldItem, TNewItem>(
  params: BuildStockUpdatesParams<TOldItem, TNewItem>
): StockDeltaUpdate[] => {
  const { oldItems, newItems, getOldDelta, getNewDelta } = params;
  const stockMap = new Map<string, number>();

  for (const item of oldItems) {
    const { itemId, delta } = getOldDelta(item);
    const currentDelta = stockMap.get(itemId) || 0;
    stockMap.set(itemId, currentDelta + delta);
  }

  for (const item of newItems) {
    const { itemId, delta } = getNewDelta(item);
    const currentDelta = stockMap.get(itemId) || 0;
    stockMap.set(itemId, currentDelta + delta);
  }

  return Array.from(stockMap.entries())
    .filter(([, increment]) => increment !== 0)
    .map(([id, increment]) => ({ id, increment }));
};

export const applyStockUpdates = async (
  updates: StockDeltaUpdate[]
): Promise<void> => {
  try {
    for (const update of updates) {
      const { data: item } = await supabase
        .from('items')
        .select('stock')
        .eq('id', update.id)
        .single();

      if (!item) {
        continue;
      }

      await supabase
        .from('items')
        .update({ stock: item.stock + update.increment })
        .eq('id', update.id);
    }
  } catch (error) {
    console.error('Error updating item stocks:', error);
  }
};

export const updateRecordWithLinkedItems = async <
  TRecord,
  TOldItem,
  TNewItem,
  TInsertedItem,
>(
  params: UpdateRecordWithLinkedItemsParams<
    TRecord,
    TOldItem,
    TNewItem,
    TInsertedItem
  >
): Promise<ServiceResponse<{ record: TRecord; items?: TInsertedItem[] }>> => {
  const {
    updateRecord,
    nextItems,
    fetchExistingItems,
    replaceItems,
    recalculateStockDifferences,
  } = params;

  try {
    const { data: record, error: recordError } = await updateRecord();

    if (recordError || !record) {
      return { data: null, error: recordError };
    }

    if (!nextItems) {
      return { data: { record }, error: null };
    }

    const { data: existingItems } = await fetchExistingItems();

    const replaceResult = await replaceItems(nextItems);
    if (replaceResult.error) {
      return { data: null, error: replaceResult.error };
    }

    await recalculateStockDifferences(existingItems || [], nextItems);

    return {
      data: {
        record,
        items: replaceResult.data || [],
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as PostgrestError };
  }
};
