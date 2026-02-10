import { act, renderHook } from '@testing-library/react';
import type { ChangeEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAgGridSearch } from './useAgGridSearch';

const fuzzySearchMatchMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/search', () => ({
  fuzzySearchMatch: fuzzySearchMatchMock,
}));

const createGridApi = (overrides: Record<string, unknown> = {}) => ({
  isDestroyed: vi.fn(() => false),
  onFilterChanged: vi.fn(),
  setGridOption: vi.fn(),
  ...overrides,
});

describe('useAgGridSearch', () => {
  beforeEach(() => {
    fuzzySearchMatchMock.mockReset();
    fuzzySearchMatchMock.mockReturnValue(true);
  });

  it('handles fuzzy-search mode with external filter callbacks', () => {
    const onDebouncedSearchChange = vi.fn();
    const gridApi = createGridApi();

    const { result } = renderHook(() =>
      useAgGridSearch({
        enableDebouncedSearch: true,
        onDebouncedSearchChange,
        initialSearch: '',
        useFuzzySearch: true,
      })
    );

    act(() => {
      result.current.onGridReady({ api: gridApi } as never);
    });

    expect(result.current.isExternalFilterPresent?.()).toBe(false);

    act(() => {
      result.current.handleSearchChange({
        target: { value: 'para' },
      } as ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.search).toBe('para');
    expect(result.current.isExternalFilterPresent?.()).toBe(true);
    expect(gridApi.onFilterChanged).toHaveBeenCalledTimes(1);
    expect(onDebouncedSearchChange).toHaveBeenCalledWith('para');

    expect(
      result.current.doesExternalFilterPass?.({
        data: { name: 'Paracetamol' },
      })
    ).toBe(true);
    expect(fuzzySearchMatchMock).toHaveBeenCalledWith(
      { name: 'Paracetamol' },
      'para'
    );

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.search).toBe('');
    expect(gridApi.onFilterChanged).toHaveBeenCalledTimes(2);
    expect(onDebouncedSearchChange).toHaveBeenLastCalledWith('');
  });

  it('uses quickFilterText in non-fuzzy mode and skips debounced callback when disabled', () => {
    const gridApi = createGridApi();

    const { result } = renderHook(() =>
      useAgGridSearch({
        useFuzzySearch: false,
        enableDebouncedSearch: false,
      })
    );

    act(() => {
      result.current.onGridReady({ api: gridApi } as never);
      result.current.handleSearchChange({
        target: { value: 'amox' },
      } as ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.isExternalFilterPresent).toBeUndefined();
    expect(result.current.doesExternalFilterPass).toBeUndefined();
    expect(gridApi.setGridOption).toHaveBeenCalledWith(
      'quickFilterText',
      'amox'
    );

    act(() => {
      result.current.clearSearch();
    });

    expect(gridApi.setGridOption).toHaveBeenCalledWith('quickFilterText', '');
    expect(gridApi.onFilterChanged).not.toHaveBeenCalled();
  });

  it('does not call grid api methods when grid is destroyed', () => {
    const gridApi = createGridApi({
      isDestroyed: vi.fn(() => true),
    });

    const { result } = renderHook(() => useAgGridSearch());

    act(() => {
      result.current.onGridReady({ api: gridApi } as never);
      result.current.handleSearchChange({
        target: { value: 'x' },
      } as ChangeEvent<HTMLInputElement>);
      result.current.clearSearch();
    });

    expect(gridApi.onFilterChanged).not.toHaveBeenCalled();
    expect(gridApi.setGridOption).not.toHaveBeenCalled();
  });

  it('returns true from external pass when search is empty', () => {
    const { result } = renderHook(() =>
      useAgGridSearch({ useFuzzySearch: true })
    );

    expect(
      result.current.doesExternalFilterPass?.({ data: { name: 'Any' } })
    ).toBe(true);
  });
});
