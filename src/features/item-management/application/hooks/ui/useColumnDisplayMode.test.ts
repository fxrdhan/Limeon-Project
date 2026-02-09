import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useColumnDisplayMode } from './useColumnDisplayMode';

const STORAGE_KEY = 'pharmasys_column_display_modes';

describe('useColumnDisplayMode', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('loads defaults and exposes helper state', () => {
    const { result } = renderHook(() => useColumnDisplayMode());

    expect(result.current.displayModeState['manufacturer.name']).toBe('name');
    expect(result.current.getColumnDisplayMode('unknown.column')).toBe('name');
    expect(result.current.isReferenceColumn('manufacturer.name')).toBe(true);
    expect(result.current.isReferenceColumn('item_name')).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('merges stored preferences, toggles only reference columns, and persists updates', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        'manufacturer.name': 'code',
      })
    );

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useColumnDisplayMode());

    expect(result.current.getColumnDisplayMode('manufacturer.name')).toBe(
      'code'
    );

    act(() => {
      result.current.toggleColumnDisplayMode('manufacturer.name');
    });

    expect(result.current.getColumnDisplayMode('manufacturer.name')).toBe(
      'name'
    );
    expect(setItemSpy).toHaveBeenCalled();

    act(() => {
      result.current.toggleColumnDisplayMode('not.reference');
    });
    expect(result.current.getColumnDisplayMode('not.reference')).toBe('name');
  });

  it('handles invalid storage payload and save failures gracefully', () => {
    localStorage.setItem(STORAGE_KEY, '{invalid-json');
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('storage denied');
      });

    const { result } = renderHook(() => useColumnDisplayMode());

    expect(result.current.getColumnDisplayMode('category.name')).toBe('name');
    expect(() => {
      act(() => {
        result.current.toggleColumnDisplayMode('category.name');
      });
    }).not.toThrow();
    expect(setItemSpy).toHaveBeenCalled();
  });
});
