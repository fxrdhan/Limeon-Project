import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTableHeight } from './useTableHeight';

describe('useTableHeight', () => {
  it('calculates table height from viewport and offset with minimum 300px', () => {
    Object.defineProperty(window, 'innerHeight', {
      value: 1000,
      configurable: true,
      writable: true,
    });

    const { result } = renderHook(() => useTableHeight(200));
    expect(result.current).toBe('800px');

    act(() => {
      Object.defineProperty(window, 'innerHeight', {
        value: 420,
        configurable: true,
        writable: true,
      });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe('300px');
  });

  it('removes resize listener on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useTableHeight(150));
    unmount();

    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});
