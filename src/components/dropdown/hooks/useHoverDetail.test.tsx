import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { useHoverDetail } from './useHoverDetail';

const createAnchorElement = () => {
  const element = document.createElement('button');

  element.getBoundingClientRect = () =>
    ({
      top: 40,
      right: 120,
      bottom: 76,
      left: 20,
      width: 100,
      height: 36,
      x: 20,
      y: 40,
      toJSON: () => ({}),
    }) as DOMRect;

  return element;
};

describe('useHoverDetail', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('suppresses a visible portal and allows it to be restored', async () => {
    const anchorElement = createAnchorElement();
    const { result } = renderHook(() => useHoverDetail());

    await act(async () => {
      await result.current.handleOptionHover(
        'alpha',
        anchorElement,
        { name: 'Alpha' },
        { immediate: true }
      );
    });

    expect(result.current.isVisible).toBe(true);

    act(() => {
      expect(result.current.suppressPortal()).toBe(true);
    });

    expect(result.current.isVisible).toBe(false);
    expect(result.current.data?.name).toBe('Alpha');

    await act(async () => {
      await result.current.handleOptionHover(
        'alpha',
        anchorElement,
        { name: 'Alpha' },
        { immediate: true }
      );
    });

    expect(result.current.isVisible).toBe(true);
  });

  it('does not request restore when suppressing before the portal is visible', () => {
    const { result } = renderHook(() => useHoverDetail());

    act(() => {
      expect(result.current.suppressPortal()).toBe(false);
    });

    expect(result.current.isVisible).toBe(false);
  });
});
