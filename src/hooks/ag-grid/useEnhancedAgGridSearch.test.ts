import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEnhancedAgGridSearch } from './useEnhancedAgGridSearch';
import type { SearchColumn, TargetedSearch } from '@/types/search';

const createGridApi = (overrides: Record<string, unknown> = {}) => ({
  isDestroyed: vi.fn(() => false),
  onFilterChanged: vi.fn(),
  setGridOption: vi.fn(),
  ...overrides,
});

const SEARCH_COLUMNS: SearchColumn[] = [
  {
    field: 'name',
    label: 'Nama',
    type: 'text',
    operators: ['contains'],
  },
];

describe('useEnhancedAgGridSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles fuzzy search flow with targeted/global search and clear operations', () => {
    const onDebouncedSearchChange = vi.fn();
    const gridApi = createGridApi();

    const { result } = renderHook(() =>
      useEnhancedAgGridSearch({
        columns: SEARCH_COLUMNS,
        enableDebouncedSearch: true,
        onDebouncedSearchChange,
        useFuzzySearch: true,
        initialSearch: 'awal',
      })
    );

    expect(result.current.search).toBe('awal');
    expect(result.current.searchColumns).toEqual(SEARCH_COLUMNS);
    expect(result.current.isExternalFilterPresent?.()).toBe(false);

    act(() => {
      result.current.onGridReady({ api: gridApi } as never);
      result.current.handleGlobalSearch('parasetamol');
    });

    expect(result.current.isExternalFilterPresent?.()).toBe(true);
    expect(gridApi.onFilterChanged).toHaveBeenCalledTimes(1);
    expect(onDebouncedSearchChange).toHaveBeenCalledWith('parasetamol');

    expect(
      result.current.doesExternalFilterPass?.({ data: { name: 'x' } })
    ).toBe(true);

    const targetedSearch: TargetedSearch = {
      column: 'name',
      operator: 'contains',
      value: 'amox',
      displayValue: 'Nama berisi amox',
    };

    act(() => {
      result.current.handleTargetedSearch(targetedSearch);
    });

    expect(result.current.targetedSearch).toEqual(targetedSearch);
    expect(gridApi.onFilterChanged).toHaveBeenCalledTimes(2);
    expect(result.current.isExternalFilterPresent?.()).toBe(true);

    act(() => {
      result.current.clearSearchUIOnly();
    });
    expect(result.current.search).toBe('');
    expect(result.current.targetedSearch).toBeNull();
    expect(gridApi.onFilterChanged).toHaveBeenCalledTimes(2);
    expect(onDebouncedSearchChange).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.search).toBe('');
    expect(result.current.targetedSearch).toBeNull();
    expect(gridApi.onFilterChanged).toHaveBeenCalledTimes(3);
    expect(onDebouncedSearchChange).toHaveBeenLastCalledWith('');
  });

  it('uses quickFilterText in non-fuzzy mode and respects destroyed grid guard', () => {
    const gridApi = createGridApi({
      isDestroyed: vi.fn(() => true),
    });

    const { result } = renderHook(() =>
      useEnhancedAgGridSearch({
        columns: SEARCH_COLUMNS,
        useFuzzySearch: false,
        enableDebouncedSearch: false,
      })
    );

    act(() => {
      result.current.onGridReady({ api: gridApi } as never);
      result.current.handleGlobalSearch('ibuprofen');
      result.current.handleTargetedSearch({
        column: 'name',
        operator: 'contains',
        value: 'ibu',
        displayValue: 'x',
      });
      result.current.clearSearch();
    });

    expect(result.current.isExternalFilterPresent).toBeUndefined();
    expect(result.current.doesExternalFilterPass).toBeUndefined();
    expect(gridApi.setGridOption).not.toHaveBeenCalled();
    expect(gridApi.onFilterChanged).not.toHaveBeenCalled();
  });

  it('updates quickFilterText when non-fuzzy grid is active', () => {
    const gridApi = createGridApi({
      isDestroyed: vi.fn(() => false),
    });

    const onDebouncedSearchChange = vi.fn();
    const { result } = renderHook(() =>
      useEnhancedAgGridSearch({
        columns: SEARCH_COLUMNS,
        useFuzzySearch: false,
        enableDebouncedSearch: true,
        onDebouncedSearchChange,
      })
    );

    act(() => {
      result.current.onGridReady({ api: gridApi } as never);
      result.current.handleGlobalSearch('ibuprofen');
    });

    expect(gridApi.setGridOption).toHaveBeenCalledWith(
      'quickFilterText',
      'ibuprofen'
    );
    expect(onDebouncedSearchChange).toHaveBeenCalledWith('ibuprofen');

    act(() => {
      result.current.clearSearch();
    });

    expect(gridApi.setGridOption).toHaveBeenCalledWith('quickFilterText', '');
    expect(onDebouncedSearchChange).toHaveBeenLastCalledWith('');
  });

  it('handles direct input search changes and updates setSearch state', () => {
    const { result } = renderHook(() =>
      useEnhancedAgGridSearch({
        columns: SEARCH_COLUMNS,
      })
    );

    act(() => {
      result.current.handleSearchChange({
        target: { value: 'abc' },
      } as ChangeEvent<HTMLInputElement>);
    });
    expect(result.current.search).toBe('abc');

    act(() => {
      result.current.setSearch('manual');
    });
    expect(result.current.search).toBe('manual');

    expect(
      result.current.doesExternalFilterPass?.({ data: { name: 'x' } })
    ).toBe(false);
  });
});
