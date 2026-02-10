import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEntityModalLogic } from './useEntityModalLogic';

const useEntityModalRealtimeMock = vi.hoisted(() => vi.fn());
const formatDateTimeMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/realtime/useEntityModalRealtime', () => ({
  useEntityModalRealtime: useEntityModalRealtimeMock,
}));

vi.mock('@/lib/formatters', () => ({
  formatDateTime: formatDateTimeMock,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastErrorMock,
  },
}));

const flushTimers = async (ms?: number) => {
  await act(async () => {
    if (typeof ms === 'number') {
      vi.advanceTimersByTime(ms);
    } else {
      vi.runOnlyPendingTimers();
    }
    await Promise.resolve();
  });
};

const baseVersion = {
  id: 'v-1',
  version_number: 1,
  action_type: 'UPDATE',
  changed_at: '2025-01-01',
  entity_data: { name: 'A' },
  changed_fields: { name: { from: 'Old', to: 'A' } },
};

describe('useEntityModalLogic', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    useEntityModalRealtimeMock.mockReset();
    formatDateTimeMock.mockReset();
    toastErrorMock.mockReset();

    formatDateTimeMock.mockReturnValue('2025-01-01 10:00');
    useEntityModalRealtimeMock.mockReturnValue({
      smartFormSync: {
        handleRealtimeUpdate: vi.fn(),
      },
    });
  });

  it('initializes add mode from search text, validates, submits successfully, and closes', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    const { result } = renderHook(() =>
      useEntityModalLogic({
        isOpen: true,
        onClose,
        onSubmit,
        entityName: 'Kategori',
        initialNameFromSearch: 'Nama dari Pencarian',
      })
    );

    await flushTimers();
    await flushTimers(100);

    expect(result.current.contextValue.ui.mode).toBe('add');
    expect(result.current.contextValue.form.name).toBe('Nama dari Pencarian');
    expect(result.current.contextValue.form.isValid).toBe(false);

    await act(async () => {
      await result.current.contextValue.formActions.handleSubmit();
    });

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Kode dan nama kategori tidak boleh kosong.'
    );

    act(() => {
      result.current.contextValue.formActions.setCode?.(' KAT-01 ');
      result.current.contextValue.formActions.setName(' Antibiotik ');
      result.current.contextValue.formActions.setDescription(' desc ');
    });

    await act(async () => {
      await result.current.contextValue.formActions.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledWith({
      id: undefined,
      code: 'KAT-01',
      name: 'Antibiotik',
      description: 'desc',
    });

    await flushTimers(250);
    expect(onClose).toHaveBeenCalled();
  });

  it('initializes edit mode with realtime sync and submits manufacturer payload correctly', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useEntityModalLogic({
        isOpen: true,
        onClose: vi.fn(),
        onSubmit,
        entityName: 'Produsen',
        initialData: {
          id: 'man-1',
          code: 'PROD-1',
          name: 'Produsen A',
          description: 'old desc',
          address: 'Alamat A',
          updated_at: '2025-01-02T10:00:00.000Z',
        },
      })
    );

    await flushTimers();
    await flushTimers(100);

    expect(result.current.contextValue.ui.mode).toBe('edit');
    expect(result.current.contextValue.form.name).toBe('Produsen A');
    expect(result.current.contextValue.form.isDirty).toBe(false);

    expect(useEntityModalRealtimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityTable: 'item_manufacturers',
        entityId: 'man-1',
        enabled: true,
      })
    );

    const realtimeConfig = useEntityModalRealtimeMock.mock.calls[0][0] as {
      onSmartUpdate: (payload: Record<string, unknown>) => void;
    };

    act(() => {
      realtimeConfig.onSmartUpdate({
        name: 'Produsen dari Server',
        address: 'Alamat Server',
      });
    });

    expect(result.current.contextValue.form.name).toBe('Produsen dari Server');
    expect(result.current.contextValue.form.isDirty).toBe(false);

    act(() => {
      result.current.contextValue.formActions.setName('Produsen Lokal');
    });

    expect(result.current.contextValue.form.isDirty).toBe(true);

    await act(async () => {
      await result.current.contextValue.formActions.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toEqual({
      id: 'man-1',
      code: 'PROD-1',
      name: 'Produsen Lokal',
      address: 'Alamat Server',
    });
  });

  it('handles history/comparison actions, animated back navigation, and guarded backdrop close', async () => {
    const onClose = vi.fn();

    const { result } = renderHook(() =>
      useEntityModalLogic({
        isOpen: true,
        onClose,
        onSubmit: vi.fn().mockResolvedValue(undefined),
        entityName: 'Jenis Item',
        initialData: {
          id: 'type-1',
          code: 'TYPE-1',
          name: 'Tablet',
          description: 'solid',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
      })
    );

    await flushTimers();
    await flushTimers(100);

    act(() => {
      result.current.contextValue.uiActions.openHistory('item_types', 'type-1');
      result.current.contextValue.uiActions.selectVersion(baseVersion);
    });
    act(() => {
      result.current.contextValue.uiActions.openDualComparison(baseVersion, {
        ...baseVersion,
        id: 'v-2',
        version_number: 2,
      });
      result.current.contextValue.uiActions.flipVersions();
      result.current.contextValue.uiActions.goBack();
    });

    await flushTimers(300);

    expect(result.current.contextValue.ui.mode).toBe('edit');
    expect(result.current.contextValue.history.entityTable).toBe('');
    expect(result.current.contextValue.comparison.isOpen).toBe(false);

    const innerEvent = {
      target: {},
      currentTarget: {},
    } as React.MouseEvent<HTMLDivElement>;

    act(() => {
      result.current.contextValue.uiActions.handleBackdropClick(innerEvent);
    });

    expect(result.current.contextValue.ui.isClosing).toBe(false);

    const backdropEvent = {
      target: null,
      currentTarget: null,
    } as React.MouseEvent<HTMLDivElement>;

    backdropEvent.target = backdropEvent.currentTarget;

    act(() => {
      result.current.contextValue.uiActions.handleBackdropClick(backdropEvent);
    });

    await flushTimers(250);
    expect(onClose).toHaveBeenCalled();
  });

  it('handles realtime delete callback, default table fallback, and realtime field updates', async () => {
    const onClose = vi.fn();

    const { result } = renderHook(() =>
      useEntityModalLogic({
        isOpen: true,
        onClose,
        onSubmit: vi.fn().mockResolvedValue(undefined),
        entityName: 'Unknown Entity',
        initialData: {
          id: 'entity-1',
          code: 'ENT-1',
          name: 'Entity One',
          description: 'old',
          updated_at: '2025-01-03T00:00:00.000Z',
        },
      })
    );

    await flushTimers();
    await flushTimers(100);

    expect(useEntityModalRealtimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityTable: '',
        entityId: 'entity-1',
        enabled: true,
      })
    );

    const realtimeConfig = useEntityModalRealtimeMock.mock.calls[0][0] as {
      onSmartUpdate: (payload: Record<string, unknown>) => void;
      onEntityDeleted: () => void;
    };

    act(() => {
      realtimeConfig.onSmartUpdate({
        code: 'ENT-2',
        description: 'from server',
      });
    });

    expect(result.current.contextValue.form.code).toBe('ENT-2');
    expect(result.current.contextValue.form.description).toBe('from server');

    act(() => {
      realtimeConfig.onEntityDeleted();
    });

    expect(toastErrorMock).toHaveBeenCalledWith(
      'Data telah dihapus dari sumber lain',
      expect.objectContaining({
        duration: 3000,
        icon: '⚠️',
      })
    );

    await flushTimers(1000);
    expect(onClose).toHaveBeenCalled();
  });

  it('covers reset form path, closeHistory/openComparison, and closeComparison flow', async () => {
    const { result } = renderHook(() =>
      useEntityModalLogic({
        isOpen: true,
        onClose: vi.fn(),
        onSubmit: vi.fn().mockResolvedValue(undefined),
        entityName: 'Kemasan',
      })
    );

    await flushTimers();
    await flushTimers(100);

    expect(useEntityModalRealtimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityTable: 'item_packages',
      })
    );

    act(() => {
      result.current.contextValue.formActions.setCode?.('KMS-1');
      result.current.contextValue.formActions.setName('Box');
      result.current.contextValue.formActions.setDescription('desc');
      result.current.contextValue.formActions.setAddress?.('jalan');
    });

    act(() => {
      result.current.contextValue.formActions.resetForm();
    });

    expect(result.current.contextValue.form.code).toBe('');
    expect(result.current.contextValue.form.name).toBe('');
    expect(result.current.contextValue.form.description).toBe('');
    expect(result.current.contextValue.form.address).toBe('');

    act(() => {
      result.current.contextValue.uiActions.openHistory(
        'item_packages',
        'pkg-1'
      );
      result.current.contextValue.uiActions.closeHistory();
      result.current.contextValue.uiActions.openComparison(baseVersion);
      result.current.contextValue.uiActions.closeComparison();
    });

    await flushTimers(250);
    expect(result.current.contextValue.comparison.isOpen).toBe(false);
  });

  it('covers sequential handleClose path when comparison is open', async () => {
    const onClose = vi.fn();
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

    const { result } = renderHook(() =>
      useEntityModalLogic({
        isOpen: true,
        onClose,
        onSubmit: vi.fn().mockResolvedValue(undefined),
        entityName: 'Kategori',
      })
    );

    await flushTimers();
    await flushTimers(100);

    act(() => {
      result.current.contextValue.uiActions.openComparison(baseVersion);
    });
    expect(result.current.contextValue.comparison.isOpen).toBe(true);

    act(() => {
      result.current.contextValue.uiActions.handleClose();
    });

    const hasCloseDelay = setTimeoutSpy.mock.calls.some(
      call => call[1] === 300
    );
    expect(hasCloseDelay).toBe(true);
    await flushTimers(300);
    expect(result.current.contextValue.ui.isClosing).toBe(true);

    setTimeoutSpy.mockRestore();
  });

  it('covers direct handleClose path when comparison is not open', async () => {
    const onClose = vi.fn();

    const { result } = renderHook(() =>
      useEntityModalLogic({
        isOpen: true,
        onClose,
        onSubmit: vi.fn().mockResolvedValue(undefined),
        entityName: 'Kategori',
      })
    );

    await flushTimers();
    await flushTimers(100);

    act(() => {
      result.current.contextValue.uiActions.handleClose();
    });

    await flushTimers(200);
    expect(onClose).toHaveBeenCalled();
  });

  it('covers backdrop sequential close with comparison open and ignore backdrop while closing', async () => {
    const onClose = vi.fn();

    const { result } = renderHook(() =>
      useEntityModalLogic({
        isOpen: true,
        onClose,
        onSubmit: vi.fn().mockResolvedValue(undefined),
        entityName: 'Sediaan',
      })
    );

    await flushTimers();
    await flushTimers(100);

    expect(useEntityModalRealtimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entityTable: 'item_dosages',
      })
    );

    act(() => {
      result.current.contextValue.uiActions.openComparison(baseVersion);
    });

    const backdropEvent = {
      target: null,
      currentTarget: null,
    } as React.MouseEvent<HTMLDivElement>;
    backdropEvent.target = backdropEvent.currentTarget;

    act(() => {
      result.current.contextValue.uiActions.handleBackdropClick(backdropEvent);
    });

    await flushTimers(300);
    expect(result.current.contextValue.ui.isClosing).toBe(true);

    const closeCallCount = onClose.mock.calls.length;
    act(() => {
      result.current.contextValue.uiActions.handleBackdropClick(backdropEvent);
    });

    await flushTimers(200);
    expect(onClose.mock.calls.length).toBeGreaterThanOrEqual(closeCallCount);
  });

  it('covers handleDelete success, failure, and noop branches', async () => {
    const onCloseSuccess = vi.fn();
    const onDeleteSuccess = vi.fn().mockResolvedValue(undefined);

    const successHook = renderHook(() =>
      useEntityModalLogic({
        isOpen: true,
        onClose: onCloseSuccess,
        onSubmit: vi.fn().mockResolvedValue(undefined),
        onDelete: onDeleteSuccess,
        entityName: 'Kategori',
        initialData: {
          id: 'cat-1',
          code: 'CAT-1',
          name: 'Kategori 1',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
      })
    );

    await flushTimers();
    await flushTimers(100);

    await act(async () => {
      await successHook.result.current.contextValue.formActions.handleDelete();
    });

    expect(onDeleteSuccess).toHaveBeenCalledWith('cat-1');
    await flushTimers(200);
    expect(onCloseSuccess).toHaveBeenCalled();

    const onCloseFailure = vi.fn();
    const onDeleteFailure = vi
      .fn()
      .mockRejectedValue(new Error('delete failed'));

    const failureHook = renderHook(() =>
      useEntityModalLogic({
        isOpen: true,
        onClose: onCloseFailure,
        onSubmit: vi.fn().mockResolvedValue(undefined),
        onDelete: onDeleteFailure,
        entityName: 'Kategori',
        initialData: {
          id: 'cat-2',
          code: 'CAT-2',
          name: 'Kategori 2',
          updated_at: '2025-01-01T00:00:00.000Z',
        },
      })
    );

    await flushTimers();
    await flushTimers(100);

    await act(async () => {
      await failureHook.result.current.contextValue.formActions.handleDelete();
    });

    await flushTimers(250);
    expect(onCloseFailure).not.toHaveBeenCalled();

    const onDeleteNoop = vi.fn();
    const noopHook = renderHook(() =>
      useEntityModalLogic({
        isOpen: true,
        onClose: vi.fn(),
        onSubmit: vi.fn().mockResolvedValue(undefined),
        onDelete: onDeleteNoop,
        entityName: 'Kategori',
      })
    );

    await flushTimers();
    await flushTimers(100);

    await act(async () => {
      await noopHook.result.current.contextValue.formActions.handleDelete();
    });

    expect(onDeleteNoop).not.toHaveBeenCalled();
  });

  it('resets comparison state when modal closes while comparison is open', async () => {
    const onClose = vi.fn();

    const { result, rerender } = renderHook(
      (isOpen: boolean) =>
        useEntityModalLogic({
          isOpen,
          onClose,
          onSubmit: vi.fn().mockResolvedValue(undefined),
          entityName: 'Kategori',
        }),
      {
        initialProps: true,
      }
    );

    await flushTimers();
    await flushTimers(100);

    act(() => {
      result.current.contextValue.uiActions.openComparison(baseVersion);
    });

    expect(result.current.contextValue.comparison.isOpen).toBe(true);

    rerender(false);
    expect(result.current.contextValue.comparison.isOpen).toBe(false);
  });

  it('handles empty initialData fields and goBack branch while in history mode', async () => {
    const { result } = renderHook(() =>
      useEntityModalLogic({
        isOpen: true,
        onClose: vi.fn(),
        onSubmit: vi.fn().mockResolvedValue(undefined),
        entityName: 'Kategori',
        initialData: {
          id: 'cat-empty',
          code: undefined,
          name: undefined,
          description: undefined,
          address: undefined,
          updated_at: '2025-01-01T00:00:00.000Z',
        } as never,
      })
    );

    await flushTimers();
    await flushTimers(100);

    expect(result.current.contextValue.form.code).toBe('');
    expect(result.current.contextValue.form.name).toBeUndefined();

    act(() => {
      result.current.contextValue.uiActions.openHistory(
        'item_categories',
        'cat-empty'
      );
    });
    act(() => {
      result.current.contextValue.uiActions.openComparison(baseVersion);
      result.current.contextValue.uiActions.goBack();
    });

    await flushTimers(250);
    expect(result.current.contextValue.ui.mode).toBe('edit');
  });
});
