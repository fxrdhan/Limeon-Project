import { useState, useRef, useCallback, useEffect } from "react";
import { GridApi, GridReadyEvent } from "ag-grid-community";
import { fuzzySearchMatch } from "@/utils/search";

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
 * Custom hook for managing AG-Grid search functionality
 * Handles both client-side fuzzy search and optional server-side debounced search
 */
export const useAgGridSearch = (
  options: UseAgGridSearchOptions = {}
): UseAgGridSearchReturn => {
  const {
    enableDebouncedSearch = false,
    onDebouncedSearchChange,
    initialSearch = "",
    useFuzzySearch = true,
  } = options;

  const [search, _setSearch] = useState(initialSearch);
  const gridRef = useRef<GridApi>(null);
  const searchRef = useRef(search);
  
  // Wrapper for setSearch that also updates searchRef immediately
  const setSearch = useCallback((value: string) => {
    _setSearch(value);
    searchRef.current = value;
  }, []);

  // Keep searchRef in sync with search state
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const isExternalFilterPresent = useFuzzySearch
    ? () => {
        const currentSearch = searchRef.current;
        return Boolean(currentSearch && currentSearch.trim().length > 0);
      }
    : undefined;

  const doesExternalFilterPass = useFuzzySearch
    ? (node: { data: Record<string, unknown> }) => {
        const currentSearch = searchRef.current;
        if (!currentSearch || currentSearch.trim().length === 0) return true;
        return fuzzySearchMatch(node.data, currentSearch);
      }
    : undefined;

  const onGridReady = useCallback((params: GridReadyEvent) => {
    gridRef.current = params.api;
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearch(value);

      if (gridRef.current && !gridRef.current.isDestroyed()) {
        if (useFuzzySearch) {
          // Use external filter for fuzzy search
          gridRef.current.onFilterChanged();
        } else {
          // Use built-in quickFilter for exact search
          gridRef.current.setGridOption("quickFilterText", value);
        }
      }

      // Optional: trigger server-side debounced search
      if (enableDebouncedSearch && onDebouncedSearchChange) {
        onDebouncedSearchChange(value);
      }
    },
    [enableDebouncedSearch, onDebouncedSearchChange, useFuzzySearch, setSearch]
  );

  const clearSearch = useCallback(() => {
    setSearch("");
    
    if (gridRef.current && !gridRef.current.isDestroyed()) {
      if (useFuzzySearch) {
        gridRef.current.onFilterChanged();
      } else {
        gridRef.current.setGridOption("quickFilterText", "");
      }
    }
    if (enableDebouncedSearch && onDebouncedSearchChange) {
      onDebouncedSearchChange("");
    }
  }, [enableDebouncedSearch, onDebouncedSearchChange, useFuzzySearch, setSearch]);

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