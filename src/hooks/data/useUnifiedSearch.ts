import { useCallback, useMemo, ChangeEvent, useRef, useEffect } from 'react';
import { GridReadyEvent, IRowNode } from 'ag-grid-community';
import { useEnhancedAgGridSearch } from '../ag-grid/useEnhancedAgGridSearch';
import { SearchColumn, TargetedSearch, FilterSearch } from '@/types/search';
import { getSearchState } from '@/utils/search';

export interface UseUnifiedSearchOptions {
  columns: SearchColumn[];
  searchMode?: 'client' | 'server' | 'hybrid';
  useFuzzySearch?: boolean;
  data?: unknown[];
  onSearch?: (searchValue: string) => void;
  onClear?: () => void;
  externalSearchHandler?: (e: ChangeEvent<HTMLInputElement>) => void;
  onFilterSearch?: (filterSearch: FilterSearch | null) => void; // AG Grid filter callback
}

export interface UnifiedSearchReturn {
  // Search state
  search: string;

  // AG Grid integration - with automatic empty search handling
  onGridReady: (params: GridReadyEvent) => void;
  isExternalFilterPresent: () => boolean;
  doesExternalFilterPass: (node: IRowNode) => boolean;

  // Search handlers
  handleSearchChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleTargetedSearch: (targetedSearch: TargetedSearch | null) => void;
  handleGlobalSearch: (searchValue: string) => void;
  handleClearSearch: () => void;

  // Enhanced search bar integration
  searchBarProps: {
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    onGlobalSearch: (searchValue: string) => void;
    onClearSearch: () => void;
    onFilterSearch: (filterSearch: FilterSearch | null) => void;
    searchState: ReturnType<typeof getSearchState>;
    columns: SearchColumn[];
    placeholder?: string;
  };

  // For external integrations
  clearSearch: () => void;
  clearSearchUIOnly: () => void; // Clear UI without triggering grid filter changes
}

/**
 * Unified search hook that consolidates search functionality
 * Handles both client-side and server-side search patterns
 * Automatically manages empty search state for consistent behavior
 */
export function useUnifiedSearch({
  columns,
  searchMode = 'client',
  useFuzzySearch = true,
  data = [],
  onSearch,
  onClear,
  externalSearchHandler,
  onFilterSearch,
}: UseUnifiedSearchOptions): UnifiedSearchReturn {
  const {
    search,
    handleSearchChange: originalHandleSearchChange,
    onGridReady: originalOnGridReady,
    isExternalFilterPresent: originalIsExternalFilterPresent,
    doesExternalFilterPass: originalDoesExternalFilterPass,
    handleTargetedSearch: originalHandleTargetedSearch,
    handleGlobalSearch: originalHandleGlobalSearch,
    clearSearch: originalClearSearch,
    clearSearchUIOnly: originalClearSearchUIOnly,
  } = useEnhancedAgGridSearch({
    columns,
    useFuzzySearch,
  });

  // Enhanced AG Grid integration with automatic empty search handling
  const isExternalFilterPresent = useCallback(() => {
    const hasSearch = search.trim() !== '';
    return hasSearch && (originalIsExternalFilterPresent?.() ?? false);
  }, [search, originalIsExternalFilterPresent]);

  const doesExternalFilterPass = useCallback(
    (node: IRowNode) => {
      // Always show all data when search is empty
      if (search.trim() === '') {
        return true;
      }
      return originalDoesExternalFilterPass?.(node) ?? true;
    },
    [search, originalDoesExternalFilterPass]
  );

  // Stable references for onSearch and onClear
  const stableOnSearch = useCallback(
    (searchValue: string) => {
      onSearch?.(searchValue);
    },
    [onSearch]
  );

  const stableOnClear = useCallback(() => {
    onClear?.();
  }, [onClear]);

  // Debounce timer for external search handlers to prevent per-character processing
  const searchDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced external search handler - prevents server calls on every character
  const debouncedExternalSearch = useCallback(
    (searchValue: string) => {
      // Clear existing timer
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }

      // Set new timer - only call external handler after user stops typing
      searchDebounceTimerRef.current = setTimeout(() => {
        if (searchMode === 'server' || searchMode === 'hybrid') {
          stableOnSearch(searchValue);
        }
      }, 200); // 200ms delay for server calls
    },
    [searchMode, stableOnSearch]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
    };
  }, []);

  // Check if value is in hashtag mode (incomplete hashtag search)
  const isHashtagMode = useCallback((value: string) => {
    if (value === '#') return true;
    if (value.startsWith('#') && !value.includes(':')) return true;
    return false;
  }, []);

  // Unified search change handler
  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      originalHandleSearchChange(e);

      // Layer: Empty State Cleanup - When input is completely empty
      if (value === '' || value.trim() === '') {
        // Cancel any pending debounced search
        if (searchDebounceTimerRef.current) {
          clearTimeout(searchDebounceTimerRef.current);
          searchDebounceTimerRef.current = null;
        }

        // Clear all search states immediately
        if (searchMode === 'server' || searchMode === 'hybrid') {
          stableOnSearch('');
        }
        stableOnClear(); // Trigger clear callback
        return; // Early return
      }

      // Call external search handler if provided (for integration with existing hooks)
      externalSearchHandler?.(e);

      // For server-side search, use DEBOUNCED handler to prevent per-character calls
      // But skip if we're in hashtag mode (incomplete hashtag search)
      if (!isHashtagMode(value)) {
        debouncedExternalSearch(value);
      }
    },
    [
      originalHandleSearchChange,
      externalSearchHandler,
      stableOnSearch,
      stableOnClear,
      searchMode,
      isHashtagMode,
      debouncedExternalSearch,
    ]
  );

  // Unified global search handler
  const handleGlobalSearch = useCallback(
    (searchValue: string) => {
      originalHandleGlobalSearch(searchValue);

      // Layer: Empty State Cleanup - When global search is empty
      if (searchValue === '' || searchValue.trim() === '') {
        // Cancel any pending debounced search
        if (searchDebounceTimerRef.current) {
          clearTimeout(searchDebounceTimerRef.current);
          searchDebounceTimerRef.current = null;
        }

        // Clear all search states immediately
        if (searchMode === 'server' || searchMode === 'hybrid') {
          stableOnSearch('');
        }
        stableOnClear(); // Trigger clear callback
        return; // Early return
      }

      // For server-side search, use DEBOUNCED handler to prevent per-character calls
      // But skip if we're in hashtag mode (incomplete hashtag search)
      if (!isHashtagMode(searchValue)) {
        debouncedExternalSearch(searchValue);
      }
    },
    [
      originalHandleGlobalSearch,
      stableOnSearch,
      stableOnClear,
      searchMode,
      isHashtagMode,
      debouncedExternalSearch,
    ]
  );

  // Unified targeted search handler (deprecated - redirects to filter search)
  const handleTargetedSearch = useCallback(
    (targetedSearch: TargetedSearch | null) => {
      // Convert targeted search to filter search to use AG Grid native filtering
      if (targetedSearch && onFilterSearch) {
        const filterSearch: FilterSearch = {
          ...targetedSearch,
          operator: 'contains', // Use contains operator for targeted search
        };
        onFilterSearch(filterSearch);
      } else if (!targetedSearch) {
        // Clear filter search when targeted search is null
        onFilterSearch?.(null);
      } else {
        // Fallback to original handler if no onFilterSearch callback
        originalHandleTargetedSearch(targetedSearch);
      }

      // For targeted search, we typically want to clear server-side search
      // since AG Grid will handle the filtering
      if (searchMode === 'server' || searchMode === 'hybrid') {
        stableOnSearch('');
      }
    },
    [originalHandleTargetedSearch, onFilterSearch, stableOnSearch, searchMode]
  );

  // Unified clear search handler
  const handleClearSearch = useCallback(() => {
    // Cancel any pending debounced search
    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
      searchDebounceTimerRef.current = null;
    }

    originalClearSearch();

    // Call external clear handler if provided
    if (searchMode === 'server' || searchMode === 'hybrid') {
      stableOnSearch('');
    }

    stableOnClear();
  }, [originalClearSearch, stableOnSearch, stableOnClear, searchMode]);

  // Stable search state calculation
  const searchState = useMemo(() => {
    return getSearchState(search, search, data);
  }, [search, data]);

  // Search bar props for easy integration
  const searchBarProps = useMemo(
    () => ({
      value: search,
      onChange: handleSearchChange,
      onGlobalSearch: handleGlobalSearch,
      onClearSearch: handleClearSearch,
      onFilterSearch: onFilterSearch || (() => {}),
      searchState,
      columns,
    }),
    [
      search,
      handleSearchChange,
      handleGlobalSearch,
      handleClearSearch,
      onFilterSearch,
      searchState,
      columns,
    ]
  );

  return {
    search,
    onGridReady: originalOnGridReady,
    isExternalFilterPresent,
    doesExternalFilterPass,
    handleSearchChange,
    handleTargetedSearch,
    handleGlobalSearch,
    handleClearSearch,
    searchBarProps,
    clearSearch: handleClearSearch,
    clearSearchUIOnly: originalClearSearchUIOnly,
  };
}
