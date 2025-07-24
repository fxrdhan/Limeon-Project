import { useCallback, useMemo, ChangeEvent } from 'react';
import { GridReadyEvent, IRowNode } from 'ag-grid-community';
import { useEnhancedAgGridSearch } from './useEnhancedAgGridSearch';
import { SearchColumn, TargetedSearch } from '@/types/search';
import { getSearchState } from '@/utils/search';

export interface UseUnifiedSearchOptions {
  columns: SearchColumn[];
  searchMode?: 'client' | 'server' | 'hybrid';
  useFuzzySearch?: boolean;
  data?: unknown[];
  onSearch?: (searchValue: string) => void;
  onClear?: () => void;
  externalSearchHandler?: (e: ChangeEvent<HTMLInputElement>) => void;
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
    onTargetedSearch: (targetedSearch: TargetedSearch | null) => void;
    onGlobalSearch: (searchValue: string) => void;
    onClearSearch: () => void;
    searchState: ReturnType<typeof getSearchState>;
    columns: SearchColumn[];
    placeholder?: string;
  };
  
  // For external integrations
  clearSearch: () => void;
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
  } = useEnhancedAgGridSearch({
    columns,
    useFuzzySearch,
  });

  // Enhanced AG Grid integration with automatic empty search handling
  const isExternalFilterPresent = useCallback(() => {
    const hasSearch = search.trim() !== '';
    return hasSearch && (originalIsExternalFilterPresent?.() ?? false);
  }, [search, originalIsExternalFilterPresent]);

  const doesExternalFilterPass = useCallback((node: IRowNode) => {
    // Always show all data when search is empty
    if (search.trim() === '') {
      return true;
    }
    return originalDoesExternalFilterPass?.(node) ?? true;
  }, [search, originalDoesExternalFilterPass]);

  // Stable references for onSearch and onClear  
  const stableOnSearch = useCallback((searchValue: string) => {
    onSearch?.(searchValue);
  }, [onSearch]);

  const stableOnClear = useCallback(() => {
    onClear?.();
  }, [onClear]);

  // Unified search change handler
  const handleSearchChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    originalHandleSearchChange(e);
    
    // Call external search handler if provided (for integration with existing hooks)
    externalSearchHandler?.(e);
    
    // For server-side search, call the external handler
    if (searchMode === 'server' || searchMode === 'hybrid') {
      stableOnSearch(value);
    }
  }, [originalHandleSearchChange, externalSearchHandler, stableOnSearch, searchMode]);

  // Unified global search handler  
  const handleGlobalSearch = useCallback((searchValue: string) => {
    originalHandleGlobalSearch(searchValue);
    
    // For server-side search, call the external handler
    if (searchMode === 'server' || searchMode === 'hybrid') {
      stableOnSearch(searchValue);
    }
  }, [originalHandleGlobalSearch, stableOnSearch, searchMode]);

  // Unified targeted search handler
  const handleTargetedSearch = useCallback((targetedSearch: TargetedSearch | null) => {
    originalHandleTargetedSearch(targetedSearch);
    
    // For targeted search, we typically want to clear server-side search
    // since AG Grid will handle the filtering
    if (searchMode === 'server' || searchMode === 'hybrid') {
      stableOnSearch('');
    }
  }, [originalHandleTargetedSearch, stableOnSearch, searchMode]);

  // Unified clear search handler
  const handleClearSearch = useCallback(() => {
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
  const searchBarProps = useMemo(() => ({
    value: search,
    onChange: handleSearchChange,
    onTargetedSearch: handleTargetedSearch,
    onGlobalSearch: handleGlobalSearch,
    onClearSearch: handleClearSearch,
    searchState,
    columns,
  }), [
    search,
    handleSearchChange,
    handleTargetedSearch,
    handleGlobalSearch,
    handleClearSearch,
    searchState,
    columns,
  ]);

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
  };
}