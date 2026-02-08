import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  FilterSearch,
  SearchColumn,
  TargetedSearch,
} from '@/types/search';
import { useUnifiedSearch } from './useUnifiedSearch';

const useEnhancedAgGridSearchMock = vi.hoisted(() => vi.fn());
const getSearchStateMock = vi.hoisted(() => vi.fn());

vi.mock('../ag-grid/useEnhancedAgGridSearch', () => ({
  useEnhancedAgGridSearch: useEnhancedAgGridSearchMock,
}));

vi.mock('@/utils/search', () => ({
  getSearchState: getSearchStateMock,
}));

const columns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Name',
    searchable: true,
    type: 'text',
  },
  {
    field: 'stock',
    headerName: 'Stock',
    searchable: true,
    type: 'number',
  },
];

describe('useUnifiedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();

    useEnhancedAgGridSearchMock.mockReset();
    getSearchStateMock.mockReset();

    getSearchStateMock.mockReturnValue('idle');
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const setupEnhancedMock = (search: string = '') => {
    const state = {
      search,
      setSearch: vi.fn(),
      handleSearchChange: vi.fn(),
      onGridReady: vi.fn(),
      isExternalFilterPresent: vi.fn(() => true),
      doesExternalFilterPass: vi.fn(() => false),
      handleTargetedSearch: vi.fn(),
      handleGlobalSearch: vi.fn(),
      clearSearch: vi.fn(),
      clearSearchUIOnly: vi.fn(),
    };

    useEnhancedAgGridSearchMock.mockReturnValue(state);
    return state;
  };

  it('wraps external filter checks with empty-search behavior', () => {
    const enhanced = setupEnhancedMock('');

    const { result } = renderHook(() =>
      useUnifiedSearch({
        columns,
      })
    );

    expect(result.current.isExternalFilterPresent()).toBe(false);
    expect(result.current.doesExternalFilterPass({} as never)).toBe(true);
    expect(enhanced.isExternalFilterPresent).not.toHaveBeenCalled();
    expect(enhanced.doesExternalFilterPass).not.toHaveBeenCalled();

    useEnhancedAgGridSearchMock.mockReturnValue({
      ...enhanced,
      search: 'aspirin',
    });

    const { result: withSearchResult } = renderHook(() =>
      useUnifiedSearch({
        columns,
      })
    );

    expect(withSearchResult.current.isExternalFilterPresent()).toBe(true);
    expect(withSearchResult.current.doesExternalFilterPass({} as never)).toBe(
      false
    );
  });

  it('handles handleSearchChange: empty clear, external handler, debounce, and hashtag skip', () => {
    const enhanced = setupEnhancedMock();
    const onSearch = vi.fn();
    const onClear = vi.fn();
    const externalSearchHandler = vi.fn();

    const { result } = renderHook(() =>
      useUnifiedSearch({
        columns,
        searchMode: 'server',
        onSearch,
        onClear,
        externalSearchHandler,
      })
    );

    act(() => {
      result.current.handleSearchChange({
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(enhanced.handleSearchChange).toHaveBeenCalled();
    expect(onSearch).toHaveBeenCalledWith('');
    expect(onClear).toHaveBeenCalled();

    act(() => {
      result.current.handleSearchChange({
        target: { value: 'aspirin' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(externalSearchHandler).toHaveBeenCalled();
    expect(onSearch).not.toHaveBeenCalledWith('aspirin');

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onSearch).toHaveBeenCalledWith('aspirin');

    onSearch.mockClear();

    act(() => {
      result.current.handleSearchChange({
        target: { value: '#name' },
      } as React.ChangeEvent<HTMLInputElement>);
      vi.advanceTimersByTime(300);
    });

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('handles handleGlobalSearch with debounce and hashtag skip', () => {
    const enhanced = setupEnhancedMock();
    const onSearch = vi.fn();
    const onClear = vi.fn();

    const { result } = renderHook(() =>
      useUnifiedSearch({
        columns,
        searchMode: 'hybrid',
        onSearch,
        onClear,
      })
    );

    act(() => {
      result.current.handleGlobalSearch('');
    });

    expect(enhanced.handleGlobalSearch).toHaveBeenCalledWith('');
    expect(onSearch).toHaveBeenCalledWith('');
    expect(onClear).toHaveBeenCalled();

    onSearch.mockClear();

    act(() => {
      result.current.handleGlobalSearch('ibuprofen');
      vi.advanceTimersByTime(200);
    });

    expect(onSearch).toHaveBeenCalledWith('ibuprofen');

    onSearch.mockClear();

    act(() => {
      result.current.handleGlobalSearch('#partial');
      vi.advanceTimersByTime(200);
    });

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('handles targeted search conversion and fallback paths', () => {
    const enhanced = setupEnhancedMock();
    const onSearch = vi.fn();
    const onFilterSearch = vi.fn();

    const targetedSearch: TargetedSearch = {
      field: 'name',
      value: 'aspirin',
      column: columns[0],
    };

    const { result } = renderHook(() =>
      useUnifiedSearch({
        columns,
        searchMode: 'server',
        onSearch,
        onFilterSearch,
      })
    );

    act(() => {
      result.current.handleTargetedSearch(targetedSearch);
    });

    expect(onFilterSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        field: 'name',
        value: 'aspirin',
        operator: 'contains',
      })
    );
    expect(onSearch).toHaveBeenCalledWith('');

    act(() => {
      result.current.handleTargetedSearch(null);
    });

    expect(onFilterSearch).toHaveBeenCalledWith(null);

    const { result: fallbackResult } = renderHook(() =>
      useUnifiedSearch({
        columns,
        searchMode: 'client',
      })
    );

    act(() => {
      fallbackResult.current.handleTargetedSearch(targetedSearch);
    });

    expect(enhanced.handleTargetedSearch).toHaveBeenCalledWith(targetedSearch);
  });

  it('handles clearSearch, searchBarProps, and debounce cleanup on unmount', () => {
    const enhanced = setupEnhancedMock('aspirin');
    const onSearch = vi.fn();
    const onClear = vi.fn();
    const onFilterSearch = vi.fn();

    const { result, unmount } = renderHook(() =>
      useUnifiedSearch({
        columns,
        searchMode: 'server',
        onSearch,
        onClear,
        onFilterSearch,
      })
    );

    expect(result.current.search).toBe('aspirin');
    expect(result.current.setSearch).toBe(enhanced.setSearch);
    expect(result.current.onGridReady).toBe(enhanced.onGridReady);
    expect(result.current.clearSearchUIOnly).toBe(enhanced.clearSearchUIOnly);

    expect(result.current.searchBarProps).toEqual(
      expect.objectContaining({
        value: 'aspirin',
        columns,
        searchState: 'idle',
      })
    );

    act(() => {
      result.current.handleSearchChange({
        target: { value: 'pending' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.handleClearSearch();
    });

    expect(enhanced.clearSearch).toHaveBeenCalled();
    expect(onSearch).toHaveBeenCalledWith('');
    expect(onClear).toHaveBeenCalled();

    onSearch.mockClear();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Pending debounce should have been cancelled by clear
    expect(onSearch).not.toHaveBeenCalledWith('pending');

    act(() => {
      result.current.clearSearch();
    });

    expect(enhanced.clearSearch).toHaveBeenCalledTimes(2);

    act(() => {
      unmount();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Unmount cleanup should prevent timer firing
    expect(onSearch).not.toHaveBeenCalledWith('pending');
  });

  it('passes through no-op onFilterSearch in searchBarProps when callback is missing', () => {
    setupEnhancedMock('');

    const { result } = renderHook(() =>
      useUnifiedSearch({
        columns,
      })
    );

    expect(() => {
      result.current.searchBarProps.onFilterSearch({} as FilterSearch);
    }).not.toThrow();

    expect(getSearchStateMock).toHaveBeenCalledWith('', '', []);
  });
});
