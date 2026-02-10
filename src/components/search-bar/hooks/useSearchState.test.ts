import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EnhancedSearchState, FilterSearch, SearchColumn } from '../types';
import { useSearchState } from './useSearchState';

const parseSearchValueMock = vi.hoisted(() => vi.fn());
const isFilterSearchValidMock = vi.hoisted(() => vi.fn());
const countGroupDepthMock = vi.hoisted(() => vi.fn());

vi.mock('../utils/searchUtils', () => ({
  parseSearchValue: parseSearchValueMock,
}));

vi.mock('../utils/validationUtils', () => ({
  isFilterSearchValid: isFilterSearchValidMock,
}));

vi.mock('../utils/groupPatternUtils', () => ({
  countGroupDepth: countGroupDepthMock,
}));

const columns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Name',
    searchable: true,
    type: 'text',
  },
];

const baseSearchMode = (
  partial: Partial<EnhancedSearchState> = {}
): EnhancedSearchState => ({
  showColumnSelector: false,
  showOperatorSelector: false,
  showJoinOperatorSelector: false,
  isFilterMode: false,
  ...partial,
});

const makeFilter = (partial: Partial<FilterSearch> = {}): FilterSearch => ({
  field: 'name',
  value: 'aspirin',
  operator: 'contains',
  column: columns[0],
  isExplicitOperator: true,
  ...partial,
});

describe('useSearchState', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    parseSearchValueMock.mockReset();
    isFilterSearchValidMock.mockReset();
    countGroupDepthMock.mockReset();

    parseSearchValueMock.mockReturnValue(baseSearchMode());
    isFilterSearchValidMock.mockReturnValue(true);
    countGroupDepthMock.mockReturnValue(0);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('derives search mode from parseSearchValue', () => {
    const parsed = baseSearchMode({ globalSearch: 'ibuprofen' });
    parseSearchValueMock.mockReturnValue(parsed);

    const { result } = renderHook(() =>
      useSearchState({
        value: 'ibuprofen',
        columns,
      })
    );

    expect(parseSearchValueMock).toHaveBeenCalledWith('ibuprofen', columns);
    expect(result.current.searchMode).toEqual(parsed);
  });

  it('runs debounced filter update for confirmed valid filter', () => {
    const onGlobalSearch = vi.fn();
    const onFilterSearch = vi.fn();
    const filterSearch = makeFilter({ isConfirmed: true });

    parseSearchValueMock.mockReturnValue(
      baseSearchMode({
        isFilterMode: true,
        filterSearch,
      })
    );

    renderHook(() =>
      useSearchState({
        value: '#name #contains aspirin##',
        columns,
        onGlobalSearch,
        onFilterSearch,
      })
    );

    expect(onFilterSearch).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(onFilterSearch).toHaveBeenCalledWith(filterSearch);
    expect(onGlobalSearch).toHaveBeenCalledWith('');
  });

  it('does not update callbacks for unbalanced grouped pattern', () => {
    const onGlobalSearch = vi.fn();
    const onFilterSearch = vi.fn();

    countGroupDepthMock.mockReturnValue(1);
    parseSearchValueMock.mockReturnValue(
      baseSearchMode({
        isFilterMode: true,
        filterSearch: makeFilter({ isConfirmed: true }),
      })
    );

    renderHook(() =>
      useSearchState({
        value: '#( #name #contains aspirin',
        columns,
        onGlobalSearch,
        onFilterSearch,
      })
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(onFilterSearch).not.toHaveBeenCalled();
    expect(onGlobalSearch).not.toHaveBeenCalled();
  });

  it('handles empty value by clearing global and filter state', () => {
    const onGlobalSearch = vi.fn();
    const onFilterSearch = vi.fn();

    renderHook(() =>
      useSearchState({
        value: '   ',
        columns,
        onGlobalSearch,
        onFilterSearch,
      })
    );

    expect(onGlobalSearch).toHaveBeenCalledWith('');
    expect(onFilterSearch).toHaveBeenCalledWith(null);
  });

  it('clears to null when filter mode value is empty and avoids stale debounce', () => {
    const onGlobalSearch = vi.fn();
    const onFilterSearch = vi.fn();
    const confirmed = makeFilter({ isConfirmed: true, value: 'aspirin' });
    const emptyFilter = makeFilter({ value: '', isConfirmed: false });

    parseSearchValueMock
      .mockReturnValueOnce(
        baseSearchMode({
          isFilterMode: true,
          filterSearch: confirmed,
        })
      )
      .mockReturnValueOnce(
        baseSearchMode({
          isFilterMode: true,
          filterSearch: emptyFilter,
        })
      );

    const { rerender } = renderHook(
      ({ value }) =>
        useSearchState({
          value,
          columns,
          onGlobalSearch,
          onFilterSearch,
        }),
      {
        initialProps: { value: '#name #contains aspirin##' },
      }
    );

    rerender({ value: '#name #contains #' });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(onFilterSearch).toHaveBeenCalledWith(null);
    expect(onGlobalSearch).toHaveBeenCalledWith('');
    expect(onFilterSearch).not.toHaveBeenCalledWith(confirmed);
  });

  it('handles global search mode and selector-clear mode branches', () => {
    const onGlobalSearch = vi.fn();
    const onFilterSearch = vi.fn();

    parseSearchValueMock
      .mockReturnValueOnce(baseSearchMode({ globalSearch: 'paracetamol' }))
      .mockReturnValueOnce(baseSearchMode({ showColumnSelector: true }));

    const { rerender } = renderHook(
      ({ value }) =>
        useSearchState({
          value,
          columns,
          onGlobalSearch,
          onFilterSearch,
        }),
      { initialProps: { value: 'paracetamol' } }
    );

    rerender({ value: '#name #' });

    expect(onGlobalSearch).toHaveBeenNthCalledWith(1, 'paracetamol');
    expect(onFilterSearch).toHaveBeenNthCalledWith(1, null);
    expect(onGlobalSearch).toHaveBeenNthCalledWith(2, '');
    expect(onFilterSearch).toHaveBeenNthCalledWith(2, null);
  });

  it('maintains filter during partial join when valid and not edit mode', () => {
    const onGlobalSearch = vi.fn();
    const onFilterSearch = vi.fn();
    const filterSearch = makeFilter({ isConfirmed: true });

    parseSearchValueMock.mockReturnValue(
      baseSearchMode({
        partialJoin: 'AND',
        isFilterMode: false,
        filterSearch,
      })
    );

    renderHook(() =>
      useSearchState({
        value: '#name #contains aspirin #and #',
        columns,
        onGlobalSearch,
        onFilterSearch,
        isEditMode: false,
      })
    );

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(onFilterSearch).toHaveBeenCalledWith(filterSearch);
    expect(onGlobalSearch).toHaveBeenCalledWith('');
  });

  it('suspends filter updates and cancels pending debounce', () => {
    const onGlobalSearch = vi.fn();
    const onFilterSearch = vi.fn();
    const filterSearch = makeFilter({ isConfirmed: true });

    parseSearchValueMock.mockReturnValue(
      baseSearchMode({
        isFilterMode: true,
        filterSearch,
      })
    );

    const { rerender } = renderHook(
      ({ suspendFilterUpdates }) =>
        useSearchState({
          value: '#name #contains aspirin##',
          columns,
          onGlobalSearch,
          onFilterSearch,
          suspendFilterUpdates,
        }),
      {
        initialProps: { suspendFilterUpdates: false },
      }
    );

    rerender({ suspendFilterUpdates: true });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onFilterSearch).not.toHaveBeenCalled();
    expect(onGlobalSearch).not.toHaveBeenCalled();
  });

  it('clears pending debounce when grouped pattern becomes unbalanced', () => {
    const onGlobalSearch = vi.fn();
    const onFilterSearch = vi.fn();
    const filterSearch = makeFilter({ isConfirmed: true });

    parseSearchValueMock
      .mockReturnValueOnce(
        baseSearchMode({
          isFilterMode: true,
          filterSearch,
        })
      )
      .mockReturnValueOnce(
        baseSearchMode({
          isFilterMode: true,
          filterSearch,
        })
      );

    countGroupDepthMock.mockReturnValueOnce(0).mockReturnValueOnce(1);

    const { rerender } = renderHook(
      ({ value }) =>
        useSearchState({
          value,
          columns,
          onGlobalSearch,
          onFilterSearch,
        }),
      {
        initialProps: { value: '#name #contains aspirin##' },
      }
    );

    const beforeCalls = onFilterSearch.mock.calls.length;

    rerender({ value: '#( #name #contains aspirin' });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onFilterSearch).toHaveBeenCalledTimes(beforeCalls + 1);
    expect(onGlobalSearch).toHaveBeenCalledTimes(beforeCalls + 1);
  });

  it('skips updates when rerendered with unchanged value', () => {
    const onGlobalSearch = vi.fn();
    const onFilterSearch = vi.fn();

    parseSearchValueMock.mockReturnValue(
      baseSearchMode({ globalSearch: 'same' })
    );

    const { rerender } = renderHook(
      ({ value }) =>
        useSearchState({
          value,
          columns,
          onGlobalSearch,
          onFilterSearch,
        }),
      {
        initialProps: { value: 'same' },
      }
    );

    rerender({ value: 'same' });

    expect(onGlobalSearch).toHaveBeenCalledTimes(1);
    expect(onFilterSearch).toHaveBeenCalledTimes(1);
  });

  it('cleans up pending debounce on unmount', () => {
    const onGlobalSearch = vi.fn();
    const onFilterSearch = vi.fn();
    const filterSearch = makeFilter({ isConfirmed: true });

    parseSearchValueMock.mockReturnValue(
      baseSearchMode({
        isFilterMode: true,
        filterSearch,
      })
    );

    const { unmount } = renderHook(() =>
      useSearchState({
        value: '#name #contains aspirin##',
        columns,
        onGlobalSearch,
        onFilterSearch,
      })
    );

    unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onFilterSearch).not.toHaveBeenCalled();
    expect(onGlobalSearch).not.toHaveBeenCalled();
  });
});
