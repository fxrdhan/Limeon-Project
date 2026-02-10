import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useItemUserInteractions } from './useItemUserInteractions';

const openConfirmDialogMock = vi.hoisted(() => vi.fn());

vi.mock('@/components/dialog-box', () => ({
  useConfirmDialog: () => ({
    openConfirmDialog: openConfirmDialogMock,
  }),
}));

describe('useItemUserInteractions', () => {
  beforeEach(() => {
    openConfirmDialogMock.mockReset();
  });

  it('opens delete confirmation and executes mutation + cache clear on confirm', () => {
    const mutate = vi.fn();
    const clearCache = vi.fn();

    const { result } = renderHook(() =>
      useItemUserInteractions({
        formState: {
          formData: { name: 'Paracetamol' } as never,
          isDirty: vi.fn(() => false),
        },
        packageConversionHook: {
          conversions: [{ id: 'conv-1' }] as never,
        },
        mutations: {
          deleteItemMutation: { mutate } as never,
        },
        cache: { clearCache },
        onClose: vi.fn(),
        itemId: 'item-1',
      })
    );

    act(() => {
      result.current.handleDeleteItem();
    });

    expect(openConfirmDialogMock).toHaveBeenCalledTimes(1);

    const payload = openConfirmDialogMock.mock.calls[0][0] as {
      title: string;
      message: string;
      variant: string;
      confirmText: string;
      onConfirm: () => void;
    };

    expect(payload.title).toBe('Konfirmasi Hapus');
    expect(payload.message).toContain('Paracetamol');
    expect(payload.variant).toBe('danger');
    expect(payload.confirmText).toBe('Hapus');

    payload.onConfirm();
    expect(mutate).toHaveBeenCalledWith('item-1');
    expect(clearCache).toHaveBeenCalledTimes(1);
  });

  it('skips delete dialog when itemId is missing and computes dirty state from conversions', () => {
    const isDirty = vi.fn(() => true);

    const { result } = renderHook(() =>
      useItemUserInteractions({
        formState: {
          formData: { name: 'No ID Item' } as never,
          isDirty,
        },
        packageConversionHook: {
          conversions: [{ id: 'conv-2' }] as never,
        },
        mutations: {
          deleteItemMutation: { mutate: vi.fn() } as never,
        },
        cache: { clearCache: vi.fn() },
        onClose: vi.fn(),
      })
    );

    act(() => {
      result.current.handleDeleteItem();
    });

    expect(openConfirmDialogMock).not.toHaveBeenCalled();
    expect(result.current.isDirty()).toBe(true);
    expect(isDirty).toHaveBeenCalledWith([{ id: 'conv-2' }]);
  });

  it('handles cancel flow for dirty and clean form states with/without closing setter', () => {
    const onClose = vi.fn();

    const { result, rerender } = renderHook(
      ({ dirty }) =>
        useItemUserInteractions({
          formState: {
            formData: { name: 'Item X' } as never,
            isDirty: vi.fn(() => dirty),
          },
          packageConversionHook: {
            conversions: [],
          },
          mutations: {
            deleteItemMutation: { mutate: vi.fn() } as never,
          },
          cache: { clearCache: vi.fn() },
          onClose,
          itemId: 'item-1',
        }),
      {
        initialProps: { dirty: true },
      }
    );

    const setIsClosing = vi.fn();

    act(() => {
      result.current.handleCancel(setIsClosing);
    });

    expect(openConfirmDialogMock).toHaveBeenCalledTimes(1);
    const payload = openConfirmDialogMock.mock.calls[0][0] as {
      title: string;
      onConfirm: () => void;
    };
    expect(payload.title).toBe('Konfirmasi Keluar');

    payload.onConfirm();
    expect(setIsClosing).toHaveBeenCalledWith(true);
    expect(onClose).not.toHaveBeenCalled();

    openConfirmDialogMock.mockReset();
    rerender({ dirty: false });

    act(() => {
      result.current.handleCancel();
    });

    expect(openConfirmDialogMock).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);

    // keep explicit check that the dirty callback branch was exercised earlier
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('uses onClose for dirty confirm without setter and setter for clean flow', () => {
    const onClose = vi.fn();

    const { result, rerender } = renderHook(
      ({ dirty }) =>
        useItemUserInteractions({
          formState: {
            formData: { name: 'Item Y' } as never,
            isDirty: vi.fn(() => dirty),
          },
          packageConversionHook: {
            conversions: [],
          },
          mutations: {
            deleteItemMutation: { mutate: vi.fn() } as never,
          },
          cache: { clearCache: vi.fn() },
          onClose,
          itemId: 'item-2',
        }),
      {
        initialProps: { dirty: true },
      }
    );

    act(() => {
      result.current.handleCancel();
    });

    const dirtyPayload = openConfirmDialogMock.mock.calls[0][0] as {
      onConfirm: () => void;
    };
    dirtyPayload.onConfirm();
    expect(onClose).toHaveBeenCalledTimes(1);

    openConfirmDialogMock.mockReset();
    const setIsClosing = vi.fn();
    rerender({ dirty: false });

    act(() => {
      result.current.handleCancel(setIsClosing);
    });

    expect(openConfirmDialogMock).not.toHaveBeenCalled();
    expect(setIsClosing).toHaveBeenCalledWith(true);
  });
});
