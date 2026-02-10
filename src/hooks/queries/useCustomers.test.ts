import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useCustomers,
  useCustomer,
  useCustomerMutations,
} from './useCustomers';
import { QueryKeys, getInvalidationKeys } from '@/constants/queryKeys';

const useQueryMock = vi.hoisted(() => vi.fn());
const useMutationMock = vi.hoisted(() => vi.fn());
const useQueryClientMock = vi.hoisted(() => vi.fn());

const invalidateQueriesMock = vi.hoisted(() => vi.fn());
const removeQueriesMock = vi.hoisted(() => vi.fn());

const customersServiceMock = vi.hoisted(() => ({
  getActiveCustomers: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}));

vi.mock('@/services/api/customers.service', () => ({
  customersService: customersServiceMock,
}));

describe('useCustomers', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useQueryClientMock.mockReset();

    invalidateQueriesMock.mockReset();
    removeQueriesMock.mockReset();

    Object.values(customersServiceMock).forEach(fn => fn.mockReset());

    useQueryClientMock.mockReturnValue({
      invalidateQueries: invalidateQueriesMock,
      removeQueries: removeQueriesMock,
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

  it('runs customer queries and respects enabled flags', async () => {
    customersServiceMock.getActiveCustomers.mockResolvedValueOnce({
      data: [{ id: 'cus-1' }],
      error: null,
    });
    customersServiceMock.getById.mockResolvedValueOnce({
      data: { id: 'cus-1' },
      error: null,
    });

    const { result: listResult } = renderHook(() =>
      useCustomers({ enabled: false })
    );
    expect(listResult.current.enabled).toBe(false);
    await expect(listResult.current.queryFn()).resolves.toEqual([
      { id: 'cus-1' },
    ]);

    const { result: detailResult } = renderHook(() => useCustomer('cus-1'));
    await expect(detailResult.current.queryFn()).resolves.toEqual({
      id: 'cus-1',
    });

    const { result: disabledDetail } = renderHook(() => useCustomer(''));
    expect(disabledDetail.current.enabled).toBe(false);
  });

  it('throws when customer query service returns error', async () => {
    const error = new Error('customer query failed');
    customersServiceMock.getActiveCustomers.mockResolvedValueOnce({
      data: null,
      error,
    });

    const { result } = renderHook(() => useCustomers());
    await expect(result.current.queryFn()).rejects.toBe(error);

    customersServiceMock.getById.mockResolvedValueOnce({
      data: null,
      error,
    });
    const { result: detailResult } = renderHook(() => useCustomer('cus-err'));
    await expect(detailResult.current.queryFn()).rejects.toBe(error);
  });

  it('runs customer mutations and invalidates/removes cache keys', async () => {
    customersServiceMock.create.mockResolvedValueOnce({
      data: { id: 'cus-1' },
      error: null,
    });
    customersServiceMock.update.mockResolvedValueOnce({
      data: { id: 'cus-1' },
      error: null,
    });
    customersServiceMock.update.mockResolvedValueOnce({
      data: {},
      error: null,
    });
    customersServiceMock.delete.mockResolvedValueOnce({
      data: { id: 'cus-1' },
      error: null,
    });

    const { result } = renderHook(() => useCustomerMutations());

    await act(async () => {
      await result.current.createCustomer.mutateAsync({
        name: 'Customer A',
      } as never);
      await result.current.updateCustomer.mutateAsync({
        id: 'cus-1',
        data: { name: 'Customer B' } as never,
      });
      await result.current.updateCustomer.mutateAsync({
        id: 'cus-2',
        data: { name: 'Customer C' } as never,
      });
      await result.current.deleteCustomer.mutateAsync('cus-1');
    });

    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: getInvalidationKeys.customers.all(),
    });
    expect(invalidateQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.customers.detail('cus-1'),
    });
    expect(removeQueriesMock).toHaveBeenCalledWith({
      queryKey: QueryKeys.customers.detail('cus-1'),
    });
  });

  it('throws mutation errors from create/update/delete operations', async () => {
    const error = new Error('mutation failed');
    customersServiceMock.create.mockResolvedValueOnce({ data: null, error });
    customersServiceMock.update.mockResolvedValueOnce({ data: null, error });
    customersServiceMock.delete.mockResolvedValueOnce({ data: null, error });

    const { result } = renderHook(() => useCustomerMutations());

    await expect(
      result.current.createCustomer.mutateAsync({ name: 'x' } as never)
    ).rejects.toBe(error);
    await expect(
      result.current.updateCustomer.mutateAsync({
        id: 'cus-1',
        data: { name: 'x' } as never,
      })
    ).rejects.toBe(error);
    await expect(
      result.current.deleteCustomer.mutateAsync('cus-1')
    ).rejects.toBe(error);
  });
});
