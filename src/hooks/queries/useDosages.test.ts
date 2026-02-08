import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useDosages,
  useDosagesRealtime,
  useDosageMutations,
} from './useDosages';
import { getInvalidationKeys } from '@/constants/queryKeys';

const useQueryMock = vi.hoisted(() => vi.fn());
const useMutationMock = vi.hoisted(() => vi.fn());
const useQueryClientMock = vi.hoisted(() => vi.fn());

const invalidateQueriesMock = vi.hoisted(() => vi.fn());

const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

const dosageServiceMock = vi.hoisted(() => ({
  getActiveDosages: vi.fn(),
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
  itemDosageService: dosageServiceMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

describe('useDosages', () => {
  beforeEach(() => {
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useQueryClientMock.mockReset();

    invalidateQueriesMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();

    dosageServiceMock.getActiveDosages.mockReset();
    dosageServiceMock.create.mockReset();
    dosageServiceMock.update.mockReset();
    dosageServiceMock.delete.mockReset();

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

  it('executes dosage queries with enabled flags and handles success/error', async () => {
    dosageServiceMock.getActiveDosages.mockResolvedValueOnce({
      data: [{ id: 'd-1', name: 'Tablet' }],
      error: null,
    });

    const { result: listResult } = renderHook(() =>
      useDosages({ enabled: false })
    );
    expect(listResult.current.enabled).toBe(false);
    await expect(listResult.current.queryFn()).resolves.toEqual([
      { id: 'd-1', name: 'Tablet' },
    ]);

    dosageServiceMock.getActiveDosages.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result: realtimeResult } = renderHook(() => useDosagesRealtime());
    expect(realtimeResult.current.enabled).toBe(true);
    await expect(realtimeResult.current.queryFn()).resolves.toEqual([]);

    const error = new Error('failed dosage fetch');
    dosageServiceMock.getActiveDosages.mockResolvedValueOnce({
      data: null,
      error,
    });
    await expect(realtimeResult.current.queryFn()).rejects.toBe(error);
  });

  it('runs create/update/delete mutations and invalidates related keys on success', async () => {
    dosageServiceMock.create.mockResolvedValueOnce({
      data: { id: 'd-1' },
      error: null,
    });
    dosageServiceMock.update.mockResolvedValueOnce({
      data: { id: 'd-1' },
      error: null,
    });
    dosageServiceMock.delete.mockResolvedValueOnce({ error: null });

    const { result } = renderHook(() => useDosageMutations());

    await act(async () => {
      await result.current.createMutation.mutateAsync({
        code: 'D01',
        name: 'Tablet',
        description: 'desc',
      });
      await result.current.updateMutation.mutateAsync({
        id: 'd-1',
        name: 'Tablet 2',
      });
      await result.current.deleteMutation.mutateAsync('d-1');
    });

    expect(toastSuccessMock).toHaveBeenCalledWith('Dosis berhasil ditambahkan');
    expect(toastSuccessMock).toHaveBeenCalledWith('Dosis berhasil diperbarui');
    expect(toastSuccessMock).toHaveBeenCalledWith('Dosis berhasil dihapus');

    const expectedKeys = getInvalidationKeys.masterData.dosages();
    expectedKeys.forEach(key => {
      expect(invalidateQueriesMock).toHaveBeenCalledWith({ queryKey: key });
    });
  });

  it('surfaces mutation errors and triggers error toasts', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const createError = new Error('create failed');
    const updateError = new Error('update failed');
    const deleteError = new Error('delete failed');

    dosageServiceMock.create.mockResolvedValueOnce({
      data: null,
      error: createError,
    });
    dosageServiceMock.update.mockResolvedValueOnce({
      data: null,
      error: updateError,
    });
    dosageServiceMock.delete.mockResolvedValueOnce({
      error: deleteError,
    });

    const { result } = renderHook(() => useDosageMutations());

    await expect(
      result.current.createMutation.mutateAsync({
        name: 'x',
        description: 'x',
      })
    ).rejects.toBe(createError);
    await expect(
      result.current.updateMutation.mutateAsync({ id: 'd-1', name: 'x' })
    ).rejects.toBe(updateError);
    await expect(result.current.deleteMutation.mutateAsync('d-1')).rejects.toBe(
      deleteError
    );

    expect(toastErrorMock).toHaveBeenCalledWith('Gagal menambahkan dosis');
    expect(toastErrorMock).toHaveBeenCalledWith('Gagal memperbarui dosis');
    expect(toastErrorMock).toHaveBeenCalledWith('Gagal menghapus dosis');

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
