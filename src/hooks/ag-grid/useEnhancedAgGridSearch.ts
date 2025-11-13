import { useState, useRef, useCallback, useEffect } from 'react';
import { GridApi, GridReadyEvent } from 'ag-grid-community';
import { SearchColumn, TargetedSearch } from '@/types/search';

interface UseEnhancedAgGridSearchOptions {
  /**
   * Whether to enable server-side debounced search
   */
  enableDebouncedSearch?: boolean;
  /**
   * Callback for debounced search value changes
   */
  onDebouncedSearchChange?: (value: string) => void;
  /**
   * Initial search value
   */
  initialSearch?: string;
  /**
   * Whether to use fuzzy search (default: true)
   */
  useFuzzySearch?: boolean;
  /**
   * Available searchable columns
   */
  columns: SearchColumn[];
}

interface UseEnhancedAgGridSearchReturn {
  /** Current search value for immediate UI feedback */
  search: string;
  /** Set search value directly */
  setSearch: (value: string) => void;
  /** AG-Grid API reference */
  gridRef: React.RefObject<GridApi | null>;
  /** Handler for search input changes */
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Handler for grid ready event */
  onGridReady: (params: GridReadyEvent) => void;
  /** Clear search and reset grid filter */
  clearSearch: () => void;
  /** Clear search UI only without triggering grid filter changes */
  clearSearchUIOnly: () => void;
  /** External filter function for enhanced search */
  isExternalFilterPresent?: () => boolean;
  /** External filter pass function for enhanced search */
  doesExternalFilterPass?: (node: { data: Record<string, unknown> }) => boolean;
  /** Current targeted search state */
  targetedSearch: TargetedSearch | null;
  /** Handler for targeted search changes */
  handleTargetedSearch: (targetedSearch: TargetedSearch | null) => void;
  /** Handler for global search changes */
  handleGlobalSearch: (search: string) => void;
  /** Available columns for search */
  searchColumns: SearchColumn[];
}

/**
 * Custom hook for managing enhanced AG-Grid search functionality
 * Handles both client-side fuzzy search and targeted column search
 */
export const useEnhancedAgGridSearch = (
  options: UseEnhancedAgGridSearchOptions
): UseEnhancedAgGridSearchReturn => {
  const {
    enableDebouncedSearch = false,
    onDebouncedSearchChange,
    initialSearch = '',
    useFuzzySearch = true,
    columns,
  } = options;

  const [search, _setSearch] = useState(initialSearch);
  const [globalSearch, setGlobalSearch] = useState('');
  const [targetedSearch, setTargetedSearch] = useState<TargetedSearch | null>(
    null
  );
  const gridRef = useRef<GridApi>(null);
  const searchRef = useRef(search);
  const globalSearchRef = useRef(globalSearch);
  const targetedSearchRef = useRef(targetedSearch);

  // Wrapper for setSearch that also updates searchRef immediately
  const setSearch = useCallback((value: string) => {
    _setSearch(value);
    searchRef.current = value;
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  useEffect(() => {
    globalSearchRef.current = globalSearch;
  }, [globalSearch]);

  useEffect(() => {
    targetedSearchRef.current = targetedSearch;
  }, [targetedSearch]);

  const isExternalFilterPresent = useFuzzySearch
    ? () => {
        const currentGlobalSearch = globalSearchRef.current;
        const currentTargetedSearch = targetedSearchRef.current;
        return Boolean(
          (currentGlobalSearch && currentGlobalSearch.trim().length > 0) ||
            (currentTargetedSearch &&
              currentTargetedSearch.value.trim().length > 0)
        );
      }
    : undefined;

  const doesExternalFilterPass = useFuzzySearch
    ? (/* node: { data: Record<string, unknown> } */) => {
        const currentGlobalSearch = globalSearchRef.current;
        const currentTargetedSearch = targetedSearchRef.current;

        // Simple fallback - if using fuzzy search, let AG Grid handle it
        // This is now deprecated since we use AG Grid native filtering
        return Boolean(currentGlobalSearch || currentTargetedSearch);
      }
    : undefined;

  const onGridReady = useCallback((params: GridReadyEvent) => {
    gridRef.current = params.api;
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearch(value);

      // The actual search logic will be handled by onTargetedSearch and onGlobalSearch callbacks
      // from the EnhancedSearchBar component
    },
    [setSearch]
  );

  const handleTargetedSearch = useCallback(
    (newTargetedSearch: TargetedSearch | null) => {
      setTargetedSearch(newTargetedSearch);

      // Clear global search when targeted search is active
      if (newTargetedSearch) {
        setGlobalSearch('');
      }

      // Simple refresh for AG Grid - no complex timeout logic needed
      if (
        gridRef.current &&
        useFuzzySearch &&
        !gridRef.current.isDestroyed?.()
      ) {
        gridRef.current.onFilterChanged();
      }
    },
    [useFuzzySearch]
  );

  const handleGlobalSearch = useCallback(
    (newGlobalSearch: string) => {
      setGlobalSearch(newGlobalSearch);

      if (gridRef.current && !gridRef.current.isDestroyed?.()) {
        if (useFuzzySearch) {
          gridRef.current.onFilterChanged();
        } else {
          gridRef.current.setGridOption('quickFilterText', newGlobalSearch);
        }
      }

      // Optional: trigger server-side debounced search
      if (enableDebouncedSearch && onDebouncedSearchChange) {
        onDebouncedSearchChange(newGlobalSearch);
      }

      // Clear targeted search when global search is active
      if (newGlobalSearch) {
        setTargetedSearch(null);
      }
    },
    [enableDebouncedSearch, onDebouncedSearchChange, useFuzzySearch]
  );

  const clearSearch = useCallback(() => {
    setSearch('');
    setGlobalSearch('');
    setTargetedSearch(null);

    if (gridRef.current && !gridRef.current.isDestroyed?.()) {
      if (useFuzzySearch) {
        gridRef.current.onFilterChanged();
      } else {
        gridRef.current.setGridOption('quickFilterText', '');
      }
    }
    if (enableDebouncedSearch && onDebouncedSearchChange) {
      onDebouncedSearchChange('');
    }
  }, [
    enableDebouncedSearch,
    onDebouncedSearchChange,
    useFuzzySearch,
    setSearch,
  ]);

  // Clear search UI only - for tab switching without clearing grid filters
  const clearSearchUIOnly = useCallback(() => {
    setSearch('');
    setGlobalSearch('');
    setTargetedSearch(null);
    // Deliberately NOT calling gridRef.onFilterChanged() or onDebouncedSearchChange
    // This preserves grid filters which are managed separately via localStorage
  }, [setSearch]);

  return {
    search,
    setSearch,
    gridRef,
    handleSearchChange,
    onGridReady,
    clearSearch,
    clearSearchUIOnly,
    isExternalFilterPresent,
    doesExternalFilterPass,
    targetedSearch,
    handleTargetedSearch,
    handleGlobalSearch,
    searchColumns: columns,
  };
};
