import { useState, useCallback, useRef, useEffect } from 'react';
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
  const [searchMode, setSearchMode] = useState<EnhancedSearchState>({
    showColumnSelector: false,
    showOperatorSelector: false,
    isFilterMode: false,
  });

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
    const newMode = parseSearchValue(value, columns);
    setSearchMode(newMode);

    if (value === '' || value.trim() === '') {
      onGlobalSearchRef.current?.('');
      onFilterSearchRef.current?.(null);
      return;
    }

    const previousValue = prevValueRef.current;
    const hasStateChanged = value !== previousValue;

    if (!hasStateChanged) return;

    if (newMode.isFilterMode && newMode.filterSearch) {
      const filterValue = newMode.filterSearch.value.trim();

      if (filterValue === '') {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        onFilterSearchRef.current?.(null);
        onGlobalSearchRef.current?.('');
      } else {
        debouncedFilterUpdate(newMode.filterSearch);
      }
    } else if (
      !newMode.showColumnSelector &&
      !newMode.showOperatorSelector &&
      !newMode.isFilterMode &&
      newMode.globalSearch !== undefined &&
      newMode.globalSearch.trim() !== '' &&
      !newMode.globalSearch.startsWith('#')
    ) {
      onGlobalSearchRef.current?.(newMode.globalSearch);
      onFilterSearchRef.current?.(null);
    } else if (newMode.showColumnSelector || newMode.showOperatorSelector) {
      onGlobalSearchRef.current?.('');
      onFilterSearchRef.current?.(null);
    }

    prevValueRef.current = value;
  }, [value, columns, debouncedFilterUpdate]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    searchMode,
    setSearchMode,
  };
};
