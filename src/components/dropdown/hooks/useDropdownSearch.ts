import { useState, useEffect, useCallback } from 'react';
import { DROPDOWN_CONSTANTS, SEARCH_STATES, SearchState } from '../constants';
import { filterAndSortOptions } from '../utils/dropdownUtils';

export const useDropdownSearch = (
  options: Array<{ id: string; name: string }>,
  searchList: boolean
) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
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
  useEffect(() => {
    if (!searchList && debouncedSearchTerm.trim() === '') {
      setFilteredOptions(options);
      setSearchState(SEARCH_STATES.IDLE);
    } else if (debouncedSearchTerm.trim() !== '') {
      const filtered = filterAndSortOptions(options, debouncedSearchTerm);
      setFilteredOptions(filtered);
      setSearchState(
        filtered.length > 0 ? SEARCH_STATES.FOUND : SEARCH_STATES.NOT_FOUND
      );
    } else {
      setFilteredOptions(options);
      setSearchState(SEARCH_STATES.IDLE);
    }
  }, [options, debouncedSearchTerm, searchList]);

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
