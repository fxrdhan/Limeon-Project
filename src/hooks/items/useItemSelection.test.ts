import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useItemSelection } from './useItemSelection';

const useItemsMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/queries', () => ({
  useItems: useItemsMock,
}));

const createItem = (overrides: Record<string, unknown> = {}) =>
  ({
    id: 'item-1',
    name: 'Paracetamol',
    code: 'PCM-001',
    barcode: '1111',
    stock: 10,
    base_price: 5000,
    package_id: 'pkg-box',
    unit: { id: 'unit-box', name: 'Box' },
    manufacturer: { name: 'Acme Pharma' },
    package_conversions: [
      { unit: { id: 'unit-strip', name: 'Strip' } },
      { unit: { id: 'unit-strip', name: 'Strip' } },
    ],
    ...overrides,
  }) as never;

describe('useItemSelection', () => {
  beforeEach(() => {
    useItemsMock.mockReset();
  });

  it('returns first 50 items when search is empty and supports refetch', () => {
    const refetch = vi.fn();
    const manyItems = Array.from({ length: 60 }, (_, index) =>
      createItem({
        id: `item-${index + 1}`,
        name: `Item ${index + 1}`,
      })
    );

    useItemsMock.mockReturnValue({
      data: manyItems,
      isLoading: false,
      error: null,
      refetch,
    });

    const { result } = renderHook(() => useItemSelection());

    expect(result.current.items).toHaveLength(50);
    expect(result.current.isLoading).toBe(false);

    result.current.refetchItems();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('filters items by search term and handles selection lifecycle', () => {
    useItemsMock.mockReturnValue({
      data: [
        createItem(),
        createItem({
          id: 'item-2',
          name: 'Ibuprofen',
          code: 'IBU-002',
          barcode: '9999',
          manufacturer: { name: 'Zen Labs' },
          stock: 0,
        }),
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useItemSelection());

    act(() => {
      result.current.handleItemSearchChange('ibu-002');
    });

    expect(result.current.searchItem).toBe('ibu-002');
    expect(result.current.showItemDropdown).toBe(true);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe('Ibuprofen');

    act(() => {
      result.current.handleSelectItem(result.current.items[0]);
    });

    expect(result.current.selectedItem?.id).toBe('item-2');
    expect(result.current.searchItem).toBe('Ibuprofen');
    expect(result.current.showItemDropdown).toBe(false);

    act(() => {
      result.current.handleClearItemSelection();
    });

    expect(result.current.selectedItem).toBeNull();
    expect(result.current.searchItem).toBe('');
    expect(result.current.showItemDropdown).toBe(false);
  });

  it('handles dropdown toggling and utility helpers', () => {
    useItemsMock.mockReturnValue({
      data: [
        createItem(),
        createItem({ id: 'item-2', name: 'Amoxicillin', stock: 0 }),
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useItemSelection({ enabled: false }));

    act(() => {
      result.current.handleItemDropdownToggle(true);
    });
    expect(result.current.showItemDropdown).toBe(true);

    act(() => {
      result.current.handleItemDropdownToggle();
    });
    expect(result.current.showItemDropdown).toBe(false);

    expect(result.current.getItemById('item-1')?.name).toBe('Paracetamol');
    expect(result.current.getItemById('missing-id')).toBeUndefined();

    const noStockItem = result.current.getItemById('item-2');
    expect(result.current.hasStock(noStockItem as never)).toBe(false);

    const units = result.current.getItemUnits(
      result.current.getItemById('item-1') as never
    );
    expect(units).toEqual([
      { id: 'pkg-box', name: 'Box' },
      { id: 'unit-strip', name: 'Strip' },
    ]);

    expect(useItemsMock).toHaveBeenCalledWith({ enabled: false });
  });

  it('returns empty list when items query does not return an array', () => {
    useItemsMock.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useItemSelection());
    expect(result.current.items).toEqual([]);
  });
});
