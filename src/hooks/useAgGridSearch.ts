import { useState, useRef, useCallback } from "react";
import { GridApi, GridReadyEvent } from "ag-grid-community";

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
}

/**
 * Custom hook for managing AG-Grid search functionality
 * Handles both client-side quickFilter and optional server-side debounced search
 */
export const useAgGridSearch = (
  options: UseAgGridSearchOptions = {}
): UseAgGridSearchReturn => {
  const {
    enableDebouncedSearch = false,
    onDebouncedSearchChange,
    initialSearch = "",
  } = options;

  const [search, setSearch] = useState(initialSearch);
  const gridRef = useRef<GridApi>(null);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    gridRef.current = params.api;
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearch(value);

      // Always update AG-Grid's quickFilterText for immediate client-side filtering
      if (gridRef.current) {
        gridRef.current.setGridOption("quickFilterText", value);
      }

      // Optional: trigger server-side debounced search
      if (enableDebouncedSearch && onDebouncedSearchChange) {
        onDebouncedSearchChange(value);
      }
    },
    [enableDebouncedSearch, onDebouncedSearchChange]
  );

  const clearSearch = useCallback(() => {
    setSearch("");
    if (gridRef.current) {
      gridRef.current.setGridOption("quickFilterText", "");
    }
    if (enableDebouncedSearch && onDebouncedSearchChange) {
      onDebouncedSearchChange("");
    }
  }, [enableDebouncedSearch, onDebouncedSearchChange]);

  return {
    search,
    setSearch,
    gridRef,
    handleSearchChange,
    onGridReady,
    clearSearch,
  };
};