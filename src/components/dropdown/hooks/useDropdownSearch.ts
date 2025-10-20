import { useState, useEffect, useCallback, useMemo } from 'react';
import { DROPDOWN_CONSTANTS, SEARCH_STATES, SearchState } from '../constants';
import { filterAndSortOptions } from '../utils/dropdownUtils';

export const useDropdownSearch = (
  options: Array<{ id: string; name: string }>,
  searchList: boolean
) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchState, setSearchState] = useState<SearchState>(
    SEARCH_STATES.IDLE
  );

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearchTerm(searchTerm),
      DROPDOWN_CONSTANTS.DEBOUNCE_DELAY
    );
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!searchList && debouncedSearchTerm.trim() === '') {
      return options;
    } else if (debouncedSearchTerm.trim() !== '') {
      return filterAndSortOptions(options, debouncedSearchTerm);
    } else {
      return options;
    }
  }, [options, debouncedSearchTerm, searchList]);

  // Derive search state from filtered results
  const derivedSearchState = useMemo(() => {
    if (!searchList && debouncedSearchTerm.trim() === '') {
      return SEARCH_STATES.IDLE;
    } else if (debouncedSearchTerm.trim() !== '') {
      return filteredOptions.length > 0
        ? SEARCH_STATES.FOUND
        : SEARCH_STATES.NOT_FOUND;
    } else {
      return SEARCH_STATES.IDLE;
    }
  }, [debouncedSearchTerm, searchList, filteredOptions.length]);

  // Sync derived state to actual state
  useEffect(() => {
    setSearchState(derivedSearchState);
  }, [derivedSearchState]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setSearchTerm(newValue);
      setSearchState(
        newValue.trim() === ''
          ? SEARCH_STATES.IDLE
          : searchState === SEARCH_STATES.IDLE
            ? SEARCH_STATES.TYPING
            : searchState
      );
    },
    [searchState]
  );

  const resetSearch = useCallback(() => {
    setSearchTerm('');
    setSearchState(SEARCH_STATES.IDLE);
  }, []);

  const updateSearchState = useCallback((state: SearchState) => {
    setSearchState(state);
  }, []);

  return {
    searchTerm,
    debouncedSearchTerm,
    searchState,
    filteredOptions,
    handleSearchChange,
    resetSearch,
    updateSearchState,
  };
};
