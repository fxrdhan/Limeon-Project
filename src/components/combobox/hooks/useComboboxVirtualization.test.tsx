import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { COMBOBOX_CONSTANTS } from '../constants';
import { useComboboxVirtualization } from './useComboboxVirtualization';

const createScrollContainer = (clientHeight: number) => {
  const container = document.createElement('div');

  Object.defineProperty(container, 'clientHeight', {
    configurable: true,
    value: clientHeight,
  });

  return container;
};

describe('useComboboxVirtualization', () => {
  it('renders a small moving window for large option lists', () => {
    const itemCount = 500;
    const container = createScrollContainer(108);
    const scrollContainerRef = { current: container };

    const { result } = renderHook(() =>
      useComboboxVirtualization({
        enabled: true,
        itemCount,
        resetKey: 'items',
        scrollContainerRef,
      })
    );

    expect(result.current.totalSize).toBe(
      itemCount * COMBOBOX_CONSTANTS.OPTION_ESTIMATED_HEIGHT
    );
    expect(result.current.virtualItems.length).toBeLessThan(itemCount);
    expect(result.current.virtualItems[0]?.index).toBe(0);

    act(() => {
      container.scrollTop = 720;
      container.dispatchEvent(new Event('scroll'));
    });

    expect(result.current.visibleRange.startIndex).toBeGreaterThan(0);
    expect(result.current.virtualItems[0]?.index).toBeGreaterThan(0);
  });
});
