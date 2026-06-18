import type { PostgrestError } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

import {
  applyStockUpdates,
  buildStockUpdates,
  updateRecordWithLinkedItems,
} from './transaction.base';
import type { ServiceResponse } from './base.service';

const response = <T>(
  data: T | null,
  error: PostgrestError | null = null
): ServiceResponse<T> => ({
  data,
  error,
});

const error = (message: string): PostgrestError =>
  Object.assign(new Error(message), {
    name: 'PostgrestError',
    code: 'TEST_ERROR',
    details: '',
    hint: '',
    toJSON: () => {
      return {
        name: 'PostgrestError',
        message,
        details: '',
        hint: '',
        code: 'TEST_ERROR',
      };
    },
  });

interface LinkedItem {
  item_id: string;
  quantity: number;
}

describe('transaction base helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({
      data: null,
      error: null,
    });
  });

  it('aggregates old and new item stock deltas and drops zero changes', () => {
    expect(
      buildStockUpdates({
        oldItems: [
          {
            item_id: 'item-1',
            quantity: 2,
          },
          {
            item_id: 'item-2',
            quantity: 3,
          },
        ],
        newItems: [
          {
            item_id: 'item-1',
            quantity: 5,
          },
          {
            item_id: 'item-2',
            quantity: 3,
          },
        ],
        getOldDelta: item => ({
          itemId: item.item_id,
          delta: item.quantity,
        }),
        getNewDelta: item => ({
          itemId: item.item_id,
          delta: -item.quantity,
        }),
      })
    ).toEqual([
      {
        id: 'item-1',
        increment: -3,
      },
    ]);
  });

  it('applies stock deltas through the atomic database rpc', async () => {
    const updates = [
      {
        id: 'item-1',
        increment: 4,
      },
      {
        id: 'item-2',
        increment: -2,
      },
    ];

    await expect(applyStockUpdates(updates)).resolves.toBeUndefined();

    expect(mockRpc).toHaveBeenCalledWith('apply_item_stock_deltas', {
      p_updates: updates,
    });
  });

  it('skips stock rpc calls when there are no deltas', async () => {
    await expect(applyStockUpdates([])).resolves.toBeUndefined();

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('surfaces stock rpc errors to the caller', async () => {
    const stockError = error('stock update failed');
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: stockError,
    });

    await expect(
      applyStockUpdates([
        {
          id: 'item-1',
          increment: -3,
        },
      ])
    ).rejects.toBe(stockError);
  });

  it('updates only the parent record when no linked item payload is supplied', async () => {
    const updateRecord = vi.fn(async () =>
      response({
        id: 'sale-1',
      })
    );
    const fetchExistingItems = vi.fn();
    const replaceItems = vi.fn();
    const recalculateStockDifferences = vi.fn();

    await expect(
      updateRecordWithLinkedItems({
        fetchExistingItems,
        nextItems: undefined,
        recalculateStockDifferences,
        replaceItems,
        updateRecord,
      })
    ).resolves.toEqual({
      data: {
        record: {
          id: 'sale-1',
        },
      },
      error: null,
    });

    expect(fetchExistingItems).not.toHaveBeenCalled();
    expect(replaceItems).not.toHaveBeenCalled();
    expect(recalculateStockDifferences).not.toHaveBeenCalled();
  });

  it('replaces linked items and recalculates stock differences after record updates', async () => {
    const oldItems = [
      {
        item_id: 'item-1',
        quantity: 1,
      },
    ];
    const nextItems = [
      {
        item_id: 'item-1',
        quantity: 2,
      },
    ];
    const insertedItems = [
      {
        id: 'sale-item-1',
        item_id: 'item-1',
        quantity: 2,
      },
    ];
    const updateRecord = vi.fn(async () =>
      response({
        id: 'sale-1',
      })
    );
    const fetchExistingItems = vi.fn(async () => response(oldItems));
    const replaceItems = vi.fn(async () => response(insertedItems));
    const recalculateStockDifferences = vi.fn(async () => undefined);

    await expect(
      updateRecordWithLinkedItems({
        fetchExistingItems,
        nextItems,
        recalculateStockDifferences,
        replaceItems,
        updateRecord,
      })
    ).resolves.toEqual({
      data: {
        items: insertedItems,
        record: {
          id: 'sale-1',
        },
      },
      error: null,
    });

    expect(fetchExistingItems).toHaveBeenCalledTimes(1);
    expect(replaceItems).toHaveBeenCalledWith(nextItems);
    expect(recalculateStockDifferences).toHaveBeenCalledWith(
      oldItems,
      nextItems
    );
  });

  it('returns stock recalculation errors after replacing linked items', async () => {
    const stockError = error('stock recalculation failed');

    await expect(
      updateRecordWithLinkedItems<
        { id: string },
        LinkedItem,
        LinkedItem,
        LinkedItem
      >({
        fetchExistingItems: vi.fn(async () =>
          response([
            {
              item_id: 'item-1',
              quantity: 1,
            },
          ])
        ),
        nextItems: [
          {
            item_id: 'item-1',
            quantity: 2,
          },
        ],
        recalculateStockDifferences: vi.fn(async () => {
          throw stockError;
        }),
        replaceItems: vi.fn(async () =>
          response([
            {
              item_id: 'item-1',
              quantity: 2,
            },
          ])
        ),
        updateRecord: vi.fn(async () =>
          response({
            id: 'sale-1',
          })
        ),
      })
    ).resolves.toEqual({
      data: null,
      error: stockError,
    });
  });

  it('returns record and replace errors without running downstream work', async () => {
    const recordError = error('record failed');
    const replaceError = error('replace failed');

    await expect(
      updateRecordWithLinkedItems<
        { id: string },
        LinkedItem,
        LinkedItem,
        LinkedItem
      >({
        fetchExistingItems: vi.fn(),
        nextItems: [],
        recalculateStockDifferences: vi.fn(),
        replaceItems: vi.fn(),
        updateRecord: vi.fn(async () =>
          response<{ id: string }>(null, recordError)
        ),
      })
    ).resolves.toEqual({
      data: null,
      error: recordError,
    });

    const recalculateStockDifferences = vi.fn();

    await expect(
      updateRecordWithLinkedItems<
        { id: string },
        LinkedItem,
        LinkedItem,
        LinkedItem
      >({
        fetchExistingItems: vi.fn(async () => response([])),
        nextItems: [],
        recalculateStockDifferences,
        replaceItems: vi.fn(async () =>
          response<LinkedItem[]>(null, replaceError)
        ),
        updateRecord: vi.fn(async () =>
          response({
            id: 'sale-1',
          })
        ),
      })
    ).resolves.toEqual({
      data: null,
      error: replaceError,
    });

    expect(recalculateStockDifferences).not.toHaveBeenCalled();
  });
});
