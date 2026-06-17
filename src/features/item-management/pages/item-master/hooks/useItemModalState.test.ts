import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { Item } from '../../../../../types/database';
import { useItemModalState } from './useItemModalState';

const createItem = (id: string, name: string): Item => ({
  id,
  name,
  manufacturer: { name: 'Acme' },
  base_price: 0,
  sell_price: 0,
  stock: 0,
  package_conversions: [],
  inventory_units: [],
  category: { name: 'Kategori' },
  type: { name: 'Tipe' },
  package: { name: 'Box' },
  unit: { name: 'Pcs' },
});

describe('useItemModalState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not let a stale close timer close a reopened item modal', () => {
    const itemA = createItem('item-a', 'Item A');
    const itemB = createItem('item-b', 'Item B');
    const { result } = renderHook(() => useItemModalState());

    act(() => {
      result.current.open(itemA, 'search-a');
    });
    act(() => {
      result.current.close();
    });

    expect(result.current.isClosing).toBe(true);

    act(() => {
      result.current.open(itemB, 'search-b');
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isClosing).toBe(false);
    expect(result.current.editingItemId).toBe('item-b');
    expect(result.current.editingItemData).toBe(itemB);
    expect(result.current.currentSearchQuery).toBe('search-b');
  });

  it('clears a pending close timer on unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() => useItemModalState());

    act(() => {
      result.current.open(createItem('item-a', 'Item A'));
    });
    act(() => {
      result.current.close();
    });

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalledOnce();
  });
});
