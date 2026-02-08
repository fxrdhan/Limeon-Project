import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useManufacturers,
  useManufacturersRealtime,
  useManufacturerMutations,
} from './useManufacturers';
import { getInvalidationKeys } from '@/constants/queryKeys';

const useQueryMock = vi.hoisted(() => vi.fn());
const useMutationMock = vi.hoisted(() => vi.fn());
const useQueryClientMock = vi.hoisted(() => vi.fn());

const invalidateQueriesMock = vi.hoisted(() => vi.fn());

const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

const manufacturerServiceMock = vi.hoisted(() => ({
  getActiveManufacturers: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: useQueryClientMock,
}));

vi.mock('@/services/api/masterData.service', () => ({
  itemManufacturerService: manufacturerServiceMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

describe('useManufacturers', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useQueryClientMock.mockReset();

    invalidateQueriesMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();

    manufacturerServiceMock.getActiveManufacturers.mockReset();
    manufacturerServiceMock.create.mockReset();
    manufacturerServiceMock.update.mockReset();
    manufacturerServiceMock.delete.mockReset();

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

  it('executes manufacturer queries with enabled flags and handles success/error', async () => {
    manufacturerServiceMock.getActiveManufacturers.mockResolvedValueOnce({
      data: [{ id: 'm-1', name: 'ACME' }],
      error: null,
    });

    const { result: listResult } = renderHook(() =>
      useManufacturers({ enabled: false })
    );
    expect(listResult.current.enabled).toBe(false);
    await expect(listResult.current.queryFn()).resolves.toEqual([
      { id: 'm-1', name: 'ACME' },
    ]);

    manufacturerServiceMock.getActiveManufacturers.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result: realtimeResult } = renderHook(() =>
      useManufacturersRealtime()
    );
    expect(realtimeResult.current.enabled).toBe(true);
    await expect(realtimeResult.current.queryFn()).resolves.toEqual([]);

    const error = new Error('failed manufacturer fetch');
    manufacturerServiceMock.getActiveManufacturers.mockResolvedValueOnce({
      data: null,
      error,
    });

    await expect(realtimeResult.current.queryFn()).rejects.toBe(error);
  });

  it('runs create/update/delete mutations and invalidates related keys on success', async () => {
    manufacturerServiceMock.create.mockResolvedValueOnce({
      data: { id: 'm-1' },
      error: null,
    });
    manufacturerServiceMock.update.mockResolvedValueOnce({
      data: { id: 'm-1' },
      error: null,
    });
    manufacturerServiceMock.delete.mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useManufacturerMutations());

    await act(async () => {
      await result.current.createMutation.mutateAsync({
        code: 'M01',
        name: 'ACME',
        address: 'Jakarta',
      });
      await result.current.updateMutation.mutateAsync({
        id: 'm-1',
        name: 'ACME 2',
      });
      await result.current.deleteMutation.mutateAsync('m-1');
    });

    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Manufaktur berhasil ditambahkan'
    );
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Manufaktur berhasil diperbarui'
    );
    expect(toastSuccessMock).toHaveBeenCalledWith(
      'Manufaktur berhasil dihapus'
    );

    const expectedKeys = getInvalidationKeys.masterData.manufacturers();
    expectedKeys.forEach(key => {
      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: key });
    });
  });

  it('surfaces mutation errors and triggers error toasts', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const createError = new Error('create failed');
    const updateError = new Error('update failed');
    const deleteError = new Error('delete failed');

    manufacturerServiceMock.create.mockResolvedValueOnce({
      data: null,
      error: createError,
    });
    manufacturerServiceMock.update.mockResolvedValueOnce({
      data: null,
      error: updateError,
    });
    manufacturerServiceMock.delete.mockResolvedValueOnce({
      error: deleteError,
    });

    const { result } = renderHook(() => useManufacturerMutations());

    await expect(
      result.current.createMutation.mutateAsync({
        name: 'x',
        address: 'x',
      })
    ).rejects.toBe(createError);
    await expect(
      result.current.updateMutation.mutateAsync({ id: 'm-1', name: 'x' })
    ).rejects.toBe(updateError);
    await expect(result.current.deleteMutation.mutateAsync('m-1')).rejects.toBe(
      deleteError
    );

    expect(toastErrorMock).toHaveBeenCalledWith('Gagal menambahkan manufaktur');
    expect(toastErrorMock).toHaveBeenCalledWith('Gagal memperbarui manufaktur');
    expect(toastErrorMock).toHaveBeenCalledWith('Gagal menghapus manufaktur');

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
