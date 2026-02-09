import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DROPDOWN_CONSTANTS, SEARCH_STATES } from '../constants';
import { useDropdownSearch } from './useDropdownSearch';

const filterAndSortOptionsMock = vi.hoisted(() => vi.fn());

vi.mock('../utils/dropdownUtils', () => ({
  filterAndSortOptions: filterAndSortOptionsMock,
}));

const options = [
  { id: '1', name: 'Paracetamol' },
  { id: '2', name: 'Amoxicillin' },
  { id: '3', name: 'Cetirizine' },
];

describe('useDropdownSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    filterAndSortOptionsMock.mockReset();
    filterAndSortOptionsMock.mockImplementation(
      (_options: Array<{ id: string; name: string }>, term: string) =>
        term === 'zzz' ? [] : [{ id: '1', name: 'Paracetamol' }]
    );
  });

  it('keeps options unfiltered when search is disabled and term is empty', () => {
    const { result } = renderHook(() => useDropdownSearch(options, false));

    expect(result.current.searchState).toBe(SEARCH_STATES.IDLE);
    expect(result.current.filteredOptions).toEqual(options);

    act(() => {
      result.current.handleSearchChange({
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.searchState).toBe(SEARCH_STATES.IDLE);
    expect(filterAndSortOptionsMock).not.toHaveBeenCalled();
  });

  it('debounces search term and derives FOUND/NOT_FOUND states', () => {
    const { result } = renderHook(() => useDropdownSearch(options, true));

    act(() => {
      result.current.handleSearchChange({
        target: { value: 'para' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.searchState).toBe(SEARCH_STATES.TYPING);
    expect(result.current.debouncedSearchTerm).toBe('');

    act(() => {
      vi.advanceTimersByTime(DROPDOWN_CONSTANTS.DEBOUNCE_DELAY + 10);
    });

    expect(result.current.debouncedSearchTerm).toBe('para');
    expect(filterAndSortOptionsMock).toHaveBeenCalledWith(options, 'para');
    expect(result.current.filteredOptions).toEqual([
      { id: '1', name: 'Paracetamol' },
    ]);
    expect(result.current.searchState).toBe(SEARCH_STATES.FOUND);

    act(() => {
      result.current.handleSearchChange({
        target: { value: 'zzz' },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      vi.advanceTimersByTime(DROPDOWN_CONSTANTS.DEBOUNCE_DELAY + 10);
    });

    expect(result.current.searchState).toBe(SEARCH_STATES.NOT_FOUND);
  });

  it('supports reset and manual search-state updates', () => {
    const { result } = renderHook(() => useDropdownSearch(options, true));

    act(() => {
      result.current.handleSearchChange({
        target: { value: 'ce' },
      } as React.ChangeEvent<HTMLInputElement>);
      vi.advanceTimersByTime(DROPDOWN_CONSTANTS.DEBOUNCE_DELAY);
    });

    expect(result.current.searchTerm).toBe('ce');

    act(() => {
      result.current.updateSearchState(SEARCH_STATES.NOT_FOUND);
    });
    expect(result.current.searchState).toBe(SEARCH_STATES.NOT_FOUND);

    act(() => {
      result.current.resetSearch();
    });

    expect(result.current.searchTerm).toBe('');
    expect(result.current.searchState).toBe(SEARCH_STATES.IDLE);
  });
});
