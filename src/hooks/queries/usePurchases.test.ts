import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  usePurchases,
  usePurchase,
  usePurchaseItems,
  usePurchasesBySupplier,
  usePurchasesByPaymentStatus,
  usePurchasesByDateRange,
  usePurchaseMutations,
  useCheckInvoiceUniqueness,
} from './usePurchases';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';

const useQueryMock = vi.hoisted(() => vi.fn());
const useMutationMock = vi.hoisted(() => vi.fn());
const useQueryClientMock = vi.hoisted(() => vi.fn());

const invalidateQueriesMock = vi.hoisted(() => vi.fn());

const purchasesServiceMock = vi.hoisted(() => ({
  getAllWithSuppliers: vi.fn(),
  getPurchaseWithDetails: vi.fn(),
  getPurchaseItems: vi.fn(),
  getPurchasesBySupplier: vi.fn(),
  getPurchasesByPaymentStatus: vi.fn(),
  getPurchasesByDateRange: vi.fn(),
  createPurchaseWithItems: vi.fn(),
  updatePurchaseWithItems: vi.fn(),
  deletePurchaseWithStockRestore: vi.fn(),
  isInvoiceNumberUnique: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}));

vi.mock('@/services/api/purchases.service', () => ({
  purchasesService: purchasesServiceMock,
}));

describe('usePurchases hooks', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useQueryClientMock.mockReset();

    invalidateQueriesMock.mockReset();

    Object.values(purchasesServiceMock).forEach(fn => fn.mockReset());

    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
    });

    useQueryMock.mockImplementation(
      (config: {
        queryKey: readonly unknown[];
        queryFn: () => Promise<unknown>;
        enabled?: boolean;
      }) => ({
        queryKey: config.queryKey,
        queryFn: config.queryFn,
        enabled: config.enabled,
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

  it('wires purchase query hooks and uniqueness checks to service calls', async () => {
    purchasesServiceMock.getAllWithSuppliers.mockResolvedValueOnce({
      data: [{ id: 'p-1' }],
      error: null,
    });
    purchasesServiceMock.getPurchaseWithDetails.mockResolvedValueOnce({
      data: { id: 'p-1' },
      error: null,
    });
    purchasesServiceMock.getPurchaseItems.mockResolvedValueOnce({
      data: [{ id: 'pi-1' }],
      error: null,
    });
    purchasesServiceMock.getPurchasesBySupplier.mockResolvedValueOnce({
      data: [{ id: 'p-1' }],
      error: null,
    });
    purchasesServiceMock.getPurchasesByPaymentStatus.mockResolvedValueOnce({
      data: [{ id: 'p-1' }],
      error: null,
    });
    purchasesServiceMock.getPurchasesByDateRange.mockResolvedValueOnce({
      data: [{ id: 'p-1' }],
      error: null,
    });
    purchasesServiceMock.isInvoiceNumberUnique.mockResolvedValueOnce(true);

    const filters = { supplier_id: 'sup-1' };
    const orderBy = { column: 'created_at', ascending: true };

    const { result: listResult } = renderHook(() =>
      usePurchases({ enabled: false, filters, orderBy })
    );
    expect(listResult.current.enabled).toBe(false);
    await expect(listResult.current.queryFn()).resolves.toEqual([
      { id: 'p-1' },
    ]);
    expect(purchasesServiceMock.getAllWithSuppliers).toHaveBeenCalledWith({
      filters,
      orderBy,
    });

    const { result: detailResult } = renderHook(() => usePurchase('p-1'));
    await expect(detailResult.current.queryFn()).resolves.toEqual({
      id: 'p-1',
    });

    const { result: itemsResult } = renderHook(() => usePurchaseItems('p-1'));
    await expect(itemsResult.current.queryFn()).resolves.toEqual([
      { id: 'pi-1' },
    ]);

    const { result: bySupplier } = renderHook(() =>
      usePurchasesBySupplier('sup-1')
    );
    await expect(bySupplier.current.queryFn()).resolves.toEqual([
      { id: 'p-1' },
    ]);

    const { result: byStatus } = renderHook(() =>
      usePurchasesByPaymentStatus('paid')
    );
    await expect(byStatus.current.queryFn()).resolves.toEqual([{ id: 'p-1' }]);

    const { result: byDate } = renderHook(() =>
      usePurchasesByDateRange('2025-01-01', '2025-01-31')
    );
    await expect(byDate.current.queryFn()).resolves.toEqual([{ id: 'p-1' }]);

    const { result: invoiceUniq } = renderHook(() =>
      useCheckInvoiceUniqueness('INV-001', 'p-1')
    );
    await expect(invoiceUniq.current.queryFn()).resolves.toBe(true);
    expect(invoiceUniq.current.enabled).toBe(true);

    const { result: emptyInvoice } = renderHook(() =>
      useCheckInvoiceUniqueness('')
    );
    expect(emptyInvoice.current.enabled).toBe(false);
  });

  it('propagates purchase query errors', async () => {
    const error = new Error('purchase query failed');
    purchasesServiceMock.getAllWithSuppliers.mockResolvedValueOnce({
      data: null,
      error,
    });
    purchasesServiceMock.getPurchaseWithDetails.mockResolvedValueOnce({
      data: null,
      error,
    });

    const { result: listResult } = renderHook(() => usePurchases());
    await expect(listResult.current.queryFn()).rejects.toBe(error);

    const { result: detailResult } = renderHook(() => usePurchase('p-err'));
    await expect(detailResult.current.queryFn()).rejects.toBe(error);
  });

  it('runs purchase mutations and invalidates related caches', async () => {
    purchasesServiceMock.createPurchaseWithItems.mockResolvedValueOnce({
      data: { id: 'p-1' },
      error: null,
    });
    purchasesServiceMock.updatePurchaseWithItems.mockResolvedValueOnce({
      data: { id: 'p-1' },
      error: null,
    });
    purchasesServiceMock.deletePurchaseWithStockRestore.mockResolvedValueOnce({
      data: { id: 'p-1' },
      error: null,
    });

    const { result } = renderHook(() => usePurchaseMutations());

    await act(async () => {
      await result.current.createPurchase.mutateAsync({
        purchaseData: { invoice_number: 'INV-001' } as never,
        items: [{ item_id: 'item-1' }] as never,
      });

      await result.current.updatePurchase.mutateAsync({
        id: 'p-1',
        purchaseData: { invoice_number: 'INV-002' } as never,
        items: [{ item_id: 'item-1' }] as never,
      });

      await result.current.deletePurchase.mutateAsync('p-1');
    });

    expect(purchasesServiceMock.createPurchaseWithItems).toHaveBeenCalledWith(
      { invoice_number: 'INV-001' },
      [{ item_id: 'item-1' }]
    );
    expect(purchasesServiceMock.updatePurchaseWithItems).toHaveBeenCalledWith(
      'p-1',
      { invoice_number: 'INV-002' },
      [{ item_id: 'item-1' }]
    );
    expect(
      purchasesServiceMock.deletePurchaseWithStockRestore
    ).toHaveBeenCalledWith('p-1');

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: getInvalidationKeys.purchases.related(),
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.purchases.detail('p-1'),
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.purchases.items('p-1'),
    });
  });

  it('throws mutation errors from purchase service', async () => {
    const error = new Error('create purchase failed');
    purchasesServiceMock.createPurchaseWithItems.mockResolvedValueOnce({
      data: null,
      error,
    });

    const { result } = renderHook(() => usePurchaseMutations());

    await expect(
      result.current.createPurchase.mutateAsync({
        purchaseData: { invoice_number: 'INV-ERR' } as never,
        items: [] as never,
      })
    ).rejects.toBe(error);
  });
});
