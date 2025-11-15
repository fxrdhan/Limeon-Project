import { useMemo, useCallback, useRef, useEffect } from 'react';
import { EnhancedSearchState, SearchColumn, FilterSearch } from '../types';
import { parseSearchValue } from '../utils/searchUtils';
import { SEARCH_CONSTANTS } from '../constants';

interface UseSearchStateProps {
  value: string;
  columns: SearchColumn[];
  onGlobalSearch?: (term: string) => void;
  onFilterSearch?: (filter: FilterSearch | null) => void;
}

export const useSearchState = ({
  value,
  columns,
  onGlobalSearch,
  onFilterSearch,
}: UseSearchStateProps) => {
  // Derive searchMode from value instead of using state + effect
  const searchMode = useMemo<EnhancedSearchState>(() => {
    return parseSearchValue(value, columns);
  }, [value, columns]);

  const prevValueRef = useRef<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onGlobalSearchRef = useRef(onGlobalSearch);
  const onFilterSearchRef = useRef(onFilterSearch);

  useEffect(() => {
    onGlobalSearchRef.current = onGlobalSearch;
    onFilterSearchRef.current = onFilterSearch;
  });

  const debouncedFilterUpdate = useCallback((filterSearch: FilterSearch) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onFilterSearchRef.current?.(filterSearch);
      onGlobalSearchRef.current?.('');
    }, SEARCH_CONSTANTS.DEBOUNCE_DELAY);
  }, []);

  useEffect(() => {
    if (value === '' || value.trim() === '') {
      onGlobalSearchRef.current?.('');
      onFilterSearchRef.current?.(null);
      return;
    }

    const previousValue = prevValueRef.current;
    const hasStateChanged = value !== previousValue;

    if (!hasStateChanged) return;

    if (searchMode.isFilterMode && searchMode.filterSearch) {
      const filterValue = searchMode.filterSearch.value.trim();

      if (filterValue === '') {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        onFilterSearchRef.current?.(null);
        onGlobalSearchRef.current?.('');
      } else {
        debouncedFilterUpdate(searchMode.filterSearch);
      }
    } else if (
      !searchMode.showColumnSelector &&
      !searchMode.showOperatorSelector &&
      !searchMode.isFilterMode &&
      searchMode.globalSearch !== undefined &&
      searchMode.globalSearch.trim() !== '' &&
      !searchMode.globalSearch.startsWith('#')
    ) {
      onGlobalSearchRef.current?.(searchMode.globalSearch);
      onFilterSearchRef.current?.(null);
    } else if (
      searchMode.showColumnSelector ||
      searchMode.showOperatorSelector
    ) {
      onGlobalSearchRef.current?.('');
      onFilterSearchRef.current?.(null);
    }

    prevValueRef.current = value;
  }, [value, columns, debouncedFilterUpdate, searchMode]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    searchMode,
  };
};
