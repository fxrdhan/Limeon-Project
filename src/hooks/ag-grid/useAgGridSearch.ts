import { useCallback } from 'react';
import type { GridApi, GridReadyEvent } from 'ag-grid-community';
import { useEnhancedAgGridSearch } from './useEnhancedAgGridSearch';
import { fuzzySearchMatch } from '@/utils/search';

interface UseAgGridSearchOptions {
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
}

interface UseAgGridSearchReturn {
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
  /** External filter function for fuzzy search */
  isExternalFilterPresent?: () => boolean;
  /** External filter pass function for fuzzy search */
  doesExternalFilterPass?: (node: { data: Record<string, unknown> }) => boolean;
}

/**
 * Legacy AG Grid search API kept for compatibility.
 * Internally delegates state/grid wiring to useEnhancedAgGridSearch.
 */
export const useAgGridSearch = (
  options: UseAgGridSearchOptions = {}
): UseAgGridSearchReturn => {
  const {
    enableDebouncedSearch = false,
    onDebouncedSearchChange,
    initialSearch = '',
    useFuzzySearch = true,
  } = options;

  const {
    search,
    setSearch,
    gridRef,
    onGridReady,
    clearSearch,
    handleSearchChange: enhancedHandleSearchChange,
    handleGlobalSearch,
  } = useEnhancedAgGridSearch({
    enableDebouncedSearch,
    onDebouncedSearchChange,
    initialSearch,
    useFuzzySearch,
    columns: [],
  });

  const isExternalFilterPresent = useFuzzySearch
    ? () => Boolean(search && search.trim().length > 0)
    : undefined;

  const doesExternalFilterPass = useFuzzySearch
    ? (node: { data: Record<string, unknown> }) => {
        if (!search || search.trim().length === 0) return true;
        return fuzzySearchMatch(node.data, search);
      }
    : undefined;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      enhancedHandleSearchChange(e);
      handleGlobalSearch(e.target.value);
    },
    [enhancedHandleSearchChange, handleGlobalSearch]
  );

  return {
    search,
    setSearch,
    gridRef,
    handleSearchChange,
    onGridReady,
    clearSearch,
    isExternalFilterPresent,
    doesExternalFilterPass,
  };
};
