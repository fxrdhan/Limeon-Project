import { useState, useEffect, useCallback } from 'react';
import { DROPDOWN_CONSTANTS, SEARCH_STATES, SearchState } from '../../constants';

export const useSearch = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchState, setSearchState] = useState<SearchState>(SEARCH_STATES.IDLE);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), DROPDOWN_CONSTANTS.DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setSearchTerm(newValue);
      setSearchState(
        newValue.trim() === ''
          ? SEARCH_STATES.IDLE
          : searchState === SEARCH_STATES.IDLE
            ? SEARCH_STATES.TYPING
            : searchState,
      );
    },
    [searchState],
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
    handleSearchChange,
    resetSearch,
    updateSearchState,
  };
};