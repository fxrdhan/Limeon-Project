import { useMemo, useCallback, useRef, useEffect } from 'react';
import { EnhancedSearchState, SearchColumn, FilterSearch } from '../types';
import { parseSearchValue } from '../utils/searchUtils';
import { SEARCH_CONSTANTS } from '../constants';
import { isFilterSearchValid } from '../utils/validationUtils';

interface UseSearchStateProps {
  value: string;
  columns: SearchColumn[];
  onGlobalSearch?: (term: string) => void;
  onFilterSearch?: (filter: FilterSearch | null) => void;
  isEditMode?: boolean; // Flag to indicate if in edit mode (preserving filter during column/operator edit)
}

export const useSearchState = ({
  value,
  columns,
  onGlobalSearch,
  onFilterSearch,
  isEditMode = false,
}: UseSearchStateProps) => {
  // Derive searchMode from value instead of using state + effect
  const searchMode = useMemo<EnhancedSearchState>(() => {
    const result = parseSearchValue(value, columns);
    return result;
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
    const shouldLog = value.includes('#(') || value.includes('#)');
    if (shouldLog) {
      console.log('[SearchState] parsed', {
        value,
        isFilterMode: searchMode.isFilterMode,
        showColumnSelector: searchMode.showColumnSelector,
        showOperatorSelector: searchMode.showOperatorSelector,
        showJoinOperatorSelector: searchMode.showJoinOperatorSelector,
        partialJoin: searchMode.partialJoin,
        activeConditionIndex: searchMode.activeConditionIndex,
        filterOperator: searchMode.filterSearch?.operator,
        filterValue: searchMode.filterSearch?.value,
        conditionsCount: searchMode.filterSearch?.conditions?.length,
        hasFilterGroup: !!searchMode.filterSearch?.filterGroup,
      });
    }

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
      } else if (searchMode.filterSearch.isConfirmed) {
        // Only trigger filter update if the entire filter object is valid
        // This prevents "NaN" or other invalid states from reaching the grid
        if (isFilterSearchValid(searchMode.filterSearch)) {
          debouncedFilterUpdate(searchMode.filterSearch);
        }
        // If confirmed but invalid, we do nothing - maintaining the previous valid filter
        // in the grid until the user fixes the value or clears the search.
      }
      // If not confirmed yet, don't trigger filter - user is still typing
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
      // 🐛 FIX BUG #1: Don't clear filter when in partial join mode (waiting for second operator/value)
      // When user selects AND/OR and is selecting second operator, we should MAINTAIN first condition's filter
      // 🐛 FIX BUG #2: Don't clear filter when in edit mode (preserving filter during column/operator edit)
      !searchMode.partialJoin && // Don't clear if in partial join state
      !searchMode.showJoinOperatorSelector && // Don't clear if join selector is open
      !isEditMode && // Don't clear if in edit mode (editing column/operator while preserving badges)
      (searchMode.showColumnSelector || searchMode.showOperatorSelector)
    ) {
      onGlobalSearchRef.current?.('');
      onFilterSearchRef.current?.(null);
    } else if (
      // NEW: Maintain filter during partial join mode (user is building multi-condition)
      // BUT don't update if in edit mode - keep the original complete filter
      searchMode.partialJoin &&
      searchMode.filterSearch &&
      !searchMode.isFilterMode &&
      !isEditMode // Don't update filter when editing - preserve the original complete filter
    ) {
      // Keep the first condition's filter active while user selects second operator/value
      // Only if it's still valid
      if (isFilterSearchValid(searchMode.filterSearch)) {
        debouncedFilterUpdate(searchMode.filterSearch);
      }
    }

    prevValueRef.current = value;
  }, [value, columns, debouncedFilterUpdate, searchMode, isEditMode]);

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
