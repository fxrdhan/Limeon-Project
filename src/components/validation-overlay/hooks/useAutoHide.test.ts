import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_AUTO_HIDE_DELAY } from '../constants';
import { useAutoHide } from './useAutoHide';

describe('useAutoHide', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('triggers onAutoHide after configured delay when conditions are met', () => {
    const onAutoHide = vi.fn();

    renderHook(() =>
      useAutoHide({
        showOverlay: true,
        error: 'Required',
        autoHide: true,
        autoHideDelay: 500,
        hasAutoHidden: false,
        onAutoHide,
      })
    );

    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(onAutoHide).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onAutoHide).toHaveBeenCalledTimes(1);
  });

  it('does not schedule auto-hide when constraints are not satisfied', () => {
    const onAutoHide = vi.fn();

    const { rerender } = renderHook(
      (props: {
        showOverlay: boolean;
        error: string | null;
        autoHide: boolean;
        autoHideDelay?: number;
        hasAutoHidden: boolean;
      }) =>
        useAutoHide({
          ...props,
          onAutoHide,
        }),
      {
        initialProps: {
          showOverlay: false,
          error: 'Required',
          autoHide: true,
          autoHideDelay: DEFAULT_AUTO_HIDE_DELAY,
          hasAutoHidden: false,
        },
      }
    );

    rerender({
      showOverlay: true,
      error: null,
      autoHide: true,
      autoHideDelay: DEFAULT_AUTO_HIDE_DELAY,
      hasAutoHidden: false,
    });
    rerender({
      showOverlay: true,
      error: 'Required',
      autoHide: false,
      autoHideDelay: DEFAULT_AUTO_HIDE_DELAY,
      hasAutoHidden: false,
    });
    rerender({
      showOverlay: true,
      error: 'Required',
      autoHide: true,
      autoHideDelay: 0,
      hasAutoHidden: false,
    });
    rerender({
      showOverlay: true,
      error: 'Required',
      autoHide: true,
      autoHideDelay: DEFAULT_AUTO_HIDE_DELAY,
      hasAutoHidden: true,
    });

    act(() => {
      vi.runAllTimers();
    });
    expect(onAutoHide).not.toHaveBeenCalled();
  });

  it('clears pending timer on cleanup', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { unmount } = renderHook(() =>
      useAutoHide({
        showOverlay: true,
        error: 'Required',
        autoHide: true,
        autoHideDelay: 1000,
        hasAutoHidden: false,
        onAutoHide: vi.fn(),
      })
    );

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
