import { useState, useEffect } from 'react';
import { SEARCH_STATES, SearchState } from '../../constants';
import { filterAndSortOptions } from '../../utils/dropdownUtils';

interface UseOptionsFilterProps {
  options: Array<{ id: string; name: string }>;
  debouncedSearchTerm: string;
  searchList: boolean;
  updateSearchState: (state: SearchState) => void;
}

export const useOptionsFilter = ({
  options,
  debouncedSearchTerm,
  searchList,
  updateSearchState,
}: UseOptionsFilterProps) => {
  const [filteredOptions, setFilteredOptions] = useState(options);

  useEffect(() => {
    if (!searchList && debouncedSearchTerm.trim() === '') {
      setFilteredOptions(options);
      updateSearchState(SEARCH_STATES.IDLE);
    } else if (debouncedSearchTerm.trim() !== '') {
      const filtered = filterAndSortOptions(options, debouncedSearchTerm);
      setFilteredOptions(filtered);
      updateSearchState(
        filtered.length > 0 ? SEARCH_STATES.FOUND : SEARCH_STATES.NOT_FOUND
      );
    } else {
      setFilteredOptions(options);
      updateSearchState(SEARCH_STATES.IDLE);
    }
  }, [options, debouncedSearchTerm, searchList, updateSearchState]);

  return {
    filteredOptions,
  };
};
