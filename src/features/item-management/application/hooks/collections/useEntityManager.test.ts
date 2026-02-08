import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntityManager } from './useEntityManager';

const openConfirmDialogMock = vi.hoisted(() => vi.fn());
const handleModalSubmitMock = vi.hoisted(() => vi.fn());
const deleteMutateAsyncMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/dialog-box', () => ({
  useConfirmDialog: () => ({
    openConfirmDialog: openConfirmDialogMock,
  }),
}));

vi.mock('./useEntityCrudOperations', () => ({
  useEntityCrudOperations: () => ({
    handleModalSubmit: handleModalSubmitMock,
    deleteMutation: {
      mutateAsync: deleteMutateAsyncMock,
    },
  }),
}));

describe('useEntityManager', () => {
  beforeEach(() => {
    openConfirmDialogMock.mockReset();
    handleModalSubmitMock.mockReset();
    deleteMutateAsyncMock.mockReset();

    handleModalSubmitMock.mockResolvedValue(undefined);
    deleteMutateAsyncMock.mockResolvedValue(undefined);
  });

  it('changes entity type with proper state reset and clears search input', async () => {
    const input = document.createElement('input');
    input.value = 'search lama';

    const onEntityChange = vi.fn();

    const { result } = renderHook(() =>
      useEntityManager({
        activeEntityType: 'categories',
        searchInputRef: { current: input },
        onEntityChange,
      })
    );

    act(() => {
      result.current.handleSearch('abc');
      result.current.handlePageChange(3);
      result.current.openAddModal();
      result.current.openEditModal({
        id: 'cat-1',
        name: 'Kategori A',
      } as never);
      result.current.handleEntityTypeChange('types');
    });

    await waitFor(() => {
      expect(result.current.currentEntityType).toBe('types');
    });

    expect(result.current.search).toBe('');
    expect(result.current.currentPage).toBe(1);
    expect(result.current.isAddModalOpen).toBe(false);
    expect(result.current.isEditModalOpen).toBe(false);
    expect(result.current.editingEntity).toBeNull();
    expect(input.value).toBe('');
    expect(onEntityChange).toHaveBeenCalledWith('types');
  });

  it('delegates submit and delete flows through confirm dialog callbacks', async () => {
    const { result } = renderHook(() => useEntityManager());

    await act(async () => {
      await result.current.handleSubmit({
        code: 'CAT-1',
        name: 'Kategori Submit',
      });
    });

    expect(handleModalSubmitMock).toHaveBeenCalledWith({
      code: 'CAT-1',
      name: 'Kategori Submit',
    });

    let confirmConfig:
      | {
          onConfirm: () => Promise<void>;
          onCancel: () => void;
        }
      | undefined;

    openConfirmDialogMock.mockImplementation(config => {
      confirmConfig = config as {
        onConfirm: () => Promise<void>;
        onCancel: () => void;
      };
    });

    const deletePromise = result.current.handleDelete({
      id: 'cat-2',
      name: 'Kategori Hapus',
    } as never);

    expect(openConfirmDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Konfirmasi Hapus',
        variant: 'danger',
      })
    );

    await act(async () => {
      await confirmConfig?.onConfirm();
    });

    await expect(deletePromise).resolves.toBeUndefined();
    expect(deleteMutateAsyncMock).toHaveBeenCalledWith('cat-2');

    const cancelPromise = result.current.handleDelete({
      id: 'cat-3',
      name: 'Kategori Cancel',
    } as never);
    const cancellation =
      expect(cancelPromise).rejects.toThrow('User cancelled');

    await act(async () => {
      confirmConfig?.onCancel();
    });

    await cancellation;
  });

  it('resets state on activeEntityType prop change while preserving itemsPerPage', async () => {
    const { result, rerender } = renderHook(
      ({
        activeEntityType,
      }: {
        activeEntityType: 'categories' | 'manufacturers';
      }) => useEntityManager({ activeEntityType }),
      { initialProps: { activeEntityType: 'categories' as const } }
    );

    act(() => {
      result.current.handleItemsPerPageChange(50);
      result.current.handleSearch('temp');
      result.current.openAddModal();
    });

    rerender({ activeEntityType: 'manufacturers' });

    await waitFor(() => {
      expect(result.current.currentEntityType).toBe('manufacturers');
    });

    expect(result.current.itemsPerPage).toBe(50);
    expect(result.current.search).toBe('');
    expect(result.current.currentPage).toBe(1);
    expect(result.current.isAddModalOpen).toBe(false);
  });
});
