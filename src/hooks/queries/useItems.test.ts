import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useItems,
  useItem,
  useSearchItems,
  useItemsByCategory,
  useItemsByType,
  useLowStockItems,
  useItemMutations,
  useCheckCodeUniqueness,
  useCheckBarcodeUniqueness,
} from './useItems';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';

const useQueryMock = vi.hoisted(() => vi.fn());
const useMutationMock = vi.hoisted(() => vi.fn());
const useQueryClientMock = vi.hoisted(() => vi.fn());

const invalidateQueriesMock = vi.hoisted(() => vi.fn());
const refetchQueriesMock = vi.hoisted(() => vi.fn());

const itemsServiceMock = vi.hoisted(() => ({
  getAll: vi.fn(),
  getItemWithDetails: vi.fn(),
  searchItems: vi.fn(),
  getItemsByCategory: vi.fn(),
  getItemsByType: vi.fn(),
  getLowStockItems: vi.fn(),
  createItemWithConversions: vi.fn(),
  updateItemWithConversions: vi.fn(),
  delete: vi.fn(),
  updateStock: vi.fn(),
  bulkUpdateStock: vi.fn(),
  isCodeUnique: vi.fn(),
  isBarcodeUnique: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}));

vi.mock('@/services/api/items.service', () => ({
  itemsService: itemsServiceMock,
}));

describe('useItems hooks', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useQueryClientMock.mockReset();

    invalidateQueriesMock.mockReset();
    refetchQueriesMock.mockReset();

    Object.values(itemsServiceMock).forEach(fn => fn.mockReset());

    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
      refetchQueries: refetchQueriesMock,
      removeQueries: vi.fn(),
    });

    useQueryMock.mockImplementation(
      (config: {
        queryKey: readonly unknown[];
        queryFn: () => Promise<unknown>;
        enabled?: boolean;
        staleTime?: number;
        gcTime?: number;
      }) => ({
        queryKey: config.queryKey,
        queryFn: config.queryFn,
        enabled: config.enabled,
        staleTime: config.staleTime,
        gcTime: config.gcTime,
      })
    );

    useMutationMock.mockImplementation(
      (config: {
        mutationFn: (arg: unknown) => Promise<unknown>;
        onSuccess?: (...args: unknown[]) => void;
        onError?: (...args: unknown[]) => void;
      }) => ({
        mutateAsync: async (arg: unknown) => {
          try {
            const result = await config.mutationFn(arg);
            config.onSuccess?.(result, arg, undefined);
            return result;
          } catch (error) {
            config.onError?.(error, arg, undefined);
            throw error;
          }
        },
      })
    );
  });

  it('wires query hooks to item services with correct options and enable flags', async () => {
    itemsServiceMock.getAll.mockResolvedValueOnce({
      data: [{ id: 'item-1' }],
      error: null,
    });
    itemsServiceMock.getAll.mockResolvedValueOnce({ data: [], error: null });
    itemsServiceMock.getItemWithDetails.mockResolvedValueOnce({
      data: { id: 'item-1' },
      error: null,
    });
    itemsServiceMock.searchItems.mockResolvedValueOnce({
      data: [{ id: 'item-1' }],
      error: null,
    });
    itemsServiceMock.getItemsByCategory.mockResolvedValueOnce({
      data: [{ id: 'cat-item' }],
      error: null,
    });
    itemsServiceMock.getItemsByType.mockResolvedValueOnce({
      data: [{ id: 'type-item' }],
      error: null,
    });
    itemsServiceMock.getLowStockItems.mockResolvedValueOnce({
      data: [{ id: 'low-item' }],
      error: null,
    });
    itemsServiceMock.isCodeUnique.mockResolvedValueOnce(true);
    itemsServiceMock.isBarcodeUnique.mockResolvedValueOnce(false);

    const filters = { is_active: true };
    const orderBy = { column: 'created_at', ascending: false };

    const { result: listWithOptions } = renderHook(() =>
      useItems({ enabled: false, filters, orderBy })
    );

    expect(listWithOptions.current.enabled).toBe(false);
    expect(listWithOptions.current.staleTime).toBe(60 * 60 * 1000);
    expect(listWithOptions.current.gcTime).toBe(2 * 60 * 60 * 1000);
    await expect(listWithOptions.current.queryFn()).resolves.toEqual([
      { id: 'item-1' },
    ]);
    expect(itemsServiceMock.getAll).toHaveBeenCalledWith({ filters, orderBy });

    const { result: listDefault } = renderHook(() => useItems());
    await expect(listDefault.current.queryFn()).resolves.toEqual([]);
    expect(itemsServiceMock.getAll).toHaveBeenCalledWith({
      filters: undefined,
      orderBy: { column: 'name', ascending: true },
    });

    const { result: detailResult } = renderHook(() => useItem('item-1'));
    await expect(detailResult.current.queryFn()).resolves.toEqual({
      id: 'item-1',
    });
    expect(itemsServiceMock.getItemWithDetails).toHaveBeenCalledWith('item-1');

    const { result: searchResult } = renderHook(() =>
      useSearchItems('para', { filters })
    );
    expect(searchResult.current.enabled).toBe(true);
    expect(searchResult.current.staleTime).toBe(0);
    expect(searchResult.current.gcTime).toBe(0);
    await expect(searchResult.current.queryFn()).resolves.toEqual([
      { id: 'item-1' },
    ]);
    expect(itemsServiceMock.searchItems).toHaveBeenCalledWith('para', {
      filters,
      orderBy: { column: 'name', ascending: true },
    });

    const { result: disabledSearch } = renderHook(() => useSearchItems(''));
    expect(disabledSearch.current.enabled).toBe(false);

    const { result: byCategory } = renderHook(() =>
      useItemsByCategory('cat-1')
    );
    await expect(byCategory.current.queryFn()).resolves.toEqual([
      { id: 'cat-item' },
    ]);

    const { result: byType } = renderHook(() => useItemsByType('type-1'));
    await expect(byType.current.queryFn()).resolves.toEqual([
      { id: 'type-item' },
    ]);

    const { result: lowStock } = renderHook(() => useLowStockItems(5));
    await expect(lowStock.current.queryFn()).resolves.toEqual([
      { id: 'low-item' },
    ]);

    const { result: codeUniq } = renderHook(() =>
      useCheckCodeUniqueness('ITM-001', 'item-1')
    );
    await expect(codeUniq.current.queryFn()).resolves.toBe(true);
    expect(codeUniq.current.enabled).toBe(true);

    const { result: barcodeUniq } = renderHook(() =>
      useCheckBarcodeUniqueness('89999', 'item-1')
    );
    await expect(barcodeUniq.current.queryFn()).resolves.toBe(false);
    expect(barcodeUniq.current.enabled).toBe(true);

    const { result: disabledCode } = renderHook(() =>
      useCheckCodeUniqueness('')
    );
    const { result: disabledBarcode } = renderHook(() =>
      useCheckBarcodeUniqueness('', undefined, { enabled: true })
    );
    expect(disabledCode.current.enabled).toBe(false);
    expect(disabledBarcode.current.enabled).toBe(false);
  });

  it('propagates query errors from item services', async () => {
    const error = new Error('fetch items failed');
    itemsServiceMock.getAll.mockResolvedValueOnce({ data: null, error });
    itemsServiceMock.getItemWithDetails.mockResolvedValueOnce({
      data: null,
      error,
    });

    const { result: list } = renderHook(() => useItems());
    await expect(list.current.queryFn()).rejects.toBe(error);

    const { result: detail } = renderHook(() => useItem('item-err'));
    await expect(detail.current.queryFn()).rejects.toBe(error);
  });

  it('runs mutations and invalidates related item queries', async () => {
    itemsServiceMock.createItemWithConversions.mockResolvedValueOnce({
      data: { id: 'item-1' },
      error: null,
    });
    itemsServiceMock.updateItemWithConversions.mockResolvedValueOnce({
      data: { id: 'item-1' },
      error: null,
    });
    itemsServiceMock.delete.mockResolvedValueOnce({
      data: { id: 'item-1' },
      error: null,
    });
    itemsServiceMock.updateStock.mockResolvedValueOnce({
      data: { id: 'item-1' },
      error: null,
    });
    itemsServiceMock.bulkUpdateStock.mockResolvedValueOnce({
      data: [{ id: 'item-1' }],
      error: null,
    });

    const { result } = renderHook(() => useItemMutations());

    await act(async () => {
      await result.current.createItem.mutateAsync({
        itemData: { code: 'ITM-001' } as never,
        packageConversions: [{ conversion_rate: 10 } as never],
      });

      await result.current.updateItem.mutateAsync({
        id: 'item-1',
        itemData: { name: 'Updated' } as never,
        packageConversions: [{ conversion_rate: 5 } as never],
      });

      await result.current.deleteItem.mutateAsync('item-1');
      await result.current.updateStock.mutateAsync({ id: 'item-1', stock: 12 });
      await result.current.bulkUpdateStock.mutateAsync([
        { id: 'item-1', stock: 20 },
      ]);
    });

    expect(itemsServiceMock.createItemWithConversions).toHaveBeenCalledWith(
      { code: 'ITM-001' },
      [{ conversion_rate: 10 }]
    );
    expect(itemsServiceMock.updateItemWithConversions).toHaveBeenCalledWith(
      'item-1',
      { name: 'Updated' },
      [{ conversion_rate: 5 }]
    );
    expect(itemsServiceMock.delete).toHaveBeenCalledWith('item-1');
    expect(itemsServiceMock.updateStock).toHaveBeenCalledWith('item-1', 12);
    expect(itemsServiceMock.bulkUpdateStock).toHaveBeenCalledWith([
      { id: 'item-1', stock: 20 },
    ]);

    const itemAllKey = QueryKeys.items.all;
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: itemAllKey,
    });
    expect(refetchQueriesMock).toHaveBeenCalledWith({ queryKey: itemAllKey });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.items.detail('item-1'),
    });

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: getInvalidationKeys.items.all(),
    });
  });

  it('throws on create mutation failures and logs underlying error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('create failed');

    itemsServiceMock.createItemWithConversions.mockResolvedValueOnce({
      data: null,
      error,
    });

    const { result } = renderHook(() => useItemMutations());

    await expect(
      result.current.createItem.mutateAsync({
        itemData: { code: 'ITM-ERR' } as never,
      })
    ).rejects.toBe(error);

    expect(consoleSpy).toHaveBeenCalledWith('Failed to create item:', error);
    consoleSpy.mockRestore();
  });
});
