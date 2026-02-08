import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useItemSelectionEffect } from './useItemSelectionEffect';

describe('useItemSelectionEffect', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates and adds purchase item when selected item exists', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    vi.spyOn(Math, 'random').mockReturnValue(0.25);

    const addItem = vi.fn();
    const onSelectItem = vi.fn();
    const onSearchItemChange = vi.fn();
    const getItemById = vi.fn().mockReturnValue({
      id: 'item-1',
      name: 'Paracetamol',
      base_price: 5000,
      code: 'PCM-001',
      unit: { name: 'Strip' },
      base_unit: 'Tablet',
    });

    renderHook(() =>
      useItemSelectionEffect({
        selectedItem: { id: 'item-1' } as never,
        addItem,
        onSelectItem,
        onSearchItemChange,
        getItemById,
      })
    );

    expect(getItemById).toHaveBeenCalledWith('item-1');
    expect(addItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringContaining('1700000000000-'),
        item_id: 'item-1',
        item_name: 'Paracetamol',
        quantity: 1,
        price: 5000,
        subtotal: 5000,
        unit: 'Strip',
        vat_percentage: 0,
        unit_conversion_rate: 1,
        item: {
          name: 'Paracetamol',
          code: 'PCM-001',
        },
      })
    );
    expect(onSelectItem).toHaveBeenCalledWith(null);
    expect(onSearchItemChange).toHaveBeenCalledWith('');
  });

  it('does nothing when selected item is null', () => {
    const addItem = vi.fn();
    const onSelectItem = vi.fn();
    const onSearchItemChange = vi.fn();
    const getItemById = vi.fn();

    renderHook(() =>
      useItemSelectionEffect({
        selectedItem: null,
        addItem,
        onSelectItem,
        onSearchItemChange,
        getItemById,
      })
    );

    expect(getItemById).not.toHaveBeenCalled();
    expect(addItem).not.toHaveBeenCalled();
    expect(onSelectItem).not.toHaveBeenCalled();
    expect(onSearchItemChange).not.toHaveBeenCalled();
  });

  it('does nothing when selected item cannot be resolved', () => {
    const addItem = vi.fn();
    const onSelectItem = vi.fn();
    const onSearchItemChange = vi.fn();
    const getItemById = vi.fn().mockReturnValue(undefined);

    renderHook(() =>
      useItemSelectionEffect({
        selectedItem: { id: 'missing-id' } as never,
        addItem,
        onSelectItem,
        onSearchItemChange,
        getItemById,
      })
    );

    expect(getItemById).toHaveBeenCalledWith('missing-id');
    expect(addItem).not.toHaveBeenCalled();
    expect(onSelectItem).not.toHaveBeenCalled();
    expect(onSearchItemChange).not.toHaveBeenCalled();
  });
});
