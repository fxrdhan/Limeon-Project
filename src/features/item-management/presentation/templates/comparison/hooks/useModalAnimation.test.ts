import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useModalAnimation } from './useModalAnimation';

describe('useModalAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts closing animation and invokes onClose once after delay', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useModalAnimation({
        isOpen: true,
        onClose,
      })
    );

    expect(result.current.isClosing).toBe(false);

    act(() => {
      result.current.handleClose();
      result.current.handleClose();
    });
    expect(result.current.isClosing).toBe(true);

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.isClosing).toBe(false);
  });

  it('resets closing state when isOpen prop changes', () => {
    const { result, rerender } = renderHook(
      ({ isOpen }: { isOpen: boolean }) =>
        useModalAnimation({
          isOpen,
          onClose: vi.fn(),
        }),
      { initialProps: { isOpen: true } }
    );

    act(() => {
      result.current.handleClose();
    });
    expect(result.current.isClosing).toBe(true);

    rerender({ isOpen: false });
    expect(result.current.isClosing).toBe(false);
  });
});
