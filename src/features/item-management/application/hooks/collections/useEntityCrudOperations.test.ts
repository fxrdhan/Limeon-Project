import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntityCrudOperations } from './useEntityCrudOperations';

const getExternalHooksMock = vi.hoisted(() => vi.fn());
const isEntityTypeSupportedMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock('../core/GenericHookFactories', () => ({
  getExternalHooks: getExternalHooksMock,
  isEntityTypeSupported: isEntityTypeSupportedMock,
}));

vi.mock('../core/EntityHookConfigurations', () => ({
  ENTITY_CONFIGURATIONS: {
    categories: {
      query: { tableName: 'item_categories' },
    },
    types: {
      query: { tableName: 'item_types' },
    },
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
  },
}));

describe('useEntityCrudOperations', () => {
  const refetchMock = vi.fn();
  const createMutateAsyncMock = vi.fn();
  const updateMutateAsyncMock = vi.fn();
  const deleteMutateAsyncMock = vi.fn();

  beforeEach(() => {
    refetchMock.mockReset();
    createMutateAsyncMock.mockReset();
    updateMutateAsyncMock.mockReset();
    deleteMutateAsyncMock.mockReset();
    getExternalHooksMock.mockReset();
    isEntityTypeSupportedMock.mockReset();
    toastErrorMock.mockReset();

    refetchMock.mockResolvedValue(undefined);
    createMutateAsyncMock.mockResolvedValue(undefined);
    updateMutateAsyncMock.mockResolvedValue(undefined);
    deleteMutateAsyncMock.mockResolvedValue(undefined);

    isEntityTypeSupportedMock.mockReturnValue(true);

    getExternalHooksMock.mockReturnValue({
      useData: () => ({ refetch: refetchMock }),
      useMutations: () => ({
        createMutation: {
          mutateAsync: createMutateAsyncMock,
          isPending: false,
          error: null,
        },
        updateMutation: {
          mutateAsync: updateMutateAsyncMock,
          isPending: false,
          error: null,
        },
        deleteMutation: {
          mutateAsync: deleteMutateAsyncMock,
          isPending: false,
          error: null,
        },
      }),
    });
  });

  it('creates, updates, and deletes entities with normalized payloads', async () => {
    const { result } = renderHook(() =>
      useEntityCrudOperations('item_categories', 'Kategori')
    );

    await act(async () => {
      await result.current.handleModalSubmit({
        code: 'CAT-1',
        name: 'Kategori A',
        description: 'Desc',
      });
    });

    expect(createMutateAsyncMock).toHaveBeenCalledWith({
      code: 'CAT-1',
      name: 'Kategori A',
      description: 'Desc',
    });

    await act(async () => {
      await result.current.handleModalSubmit({
        id: 'cat-1',
        code: 'CAT-1',
        name: 'Kategori B',
        description: 'Desc 2',
      });
    });

    expect(updateMutateAsyncMock).toHaveBeenCalledWith({
      id: 'cat-1',
      code: 'CAT-1',
      name: 'Kategori B',
      description: 'Desc 2',
    });

    await act(async () => {
      await result.current.deleteMutation.mutateAsync('cat-1');
    });

    expect(deleteMutateAsyncMock).toHaveBeenCalledWith('cat-1');
    expect(refetchMock).toHaveBeenCalledTimes(3);
    expect(result.current.deleteMutation.isLoading).toBe(false);
    expect(result.current.deleteMutation.error).toBeNull();
  });

  it('shows duplicate-code and generic submit errors', async () => {
    const duplicateError = {
      code: '23505',
      message: 'duplicate key value violates unique constraint',
      details: 'already exists',
    };

    createMutateAsyncMock.mockRejectedValueOnce(duplicateError);

    const { result } = renderHook(() =>
      useEntityCrudOperations('item_categories', 'Kategori')
    );

    await expect(
      result.current.handleModalSubmit({
        code: 'CAT-X',
        name: 'Kategori X',
      })
    ).rejects.toBe(duplicateError);

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Code "CAT-X" sudah digunakan oleh kategori lain. Silakan gunakan code yang berbeda.'
    );

    const genericError = new Error('boom');
    updateMutateAsyncMock.mockRejectedValueOnce(genericError);

    await expect(
      result.current.handleModalSubmit({
        id: 'cat-2',
        code: 'CAT-2',
        name: 'Kategori Y',
      })
    ).rejects.toBe(genericError);

    expect(toastErrorMock).toHaveBeenNthCalledWith(
      2,
      'Gagal memperbarui Kategori: Error: boom'
    );
  });

  it('handles foreign-key delete failures and unsupported tables', async () => {
    const { result } = renderHook(() =>
      useEntityCrudOperations('item_categories', 'Kategori')
    );

    const fkError = new Error('violates foreign key constraint');
    deleteMutateAsyncMock.mockRejectedValueOnce(fkError);

    await expect(
      result.current.deleteMutation.mutateAsync('cat-3')
    ).rejects.toBe(fkError);

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Tidak dapat menghapus kategori karena masih digunakan di data lain. Hapus terlebih dahulu data yang menggunakannya.'
    );

    isEntityTypeSupportedMock.mockReturnValue(false);

    expect(() =>
      renderHook(() => useEntityCrudOperations('unknown_table', 'X'))
    ).toThrow('Unsupported table: unknown_table');
  });
});
