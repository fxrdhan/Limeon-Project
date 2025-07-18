import { useState, useRef, useCallback, useEffect } from "react";
import { GridApi, GridReadyEvent } from "ag-grid-community";
import { fuzzySearchMatch } from "@/utils/search";
import { SearchColumn, TargetedSearch } from "@/types/search";

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
 * Enhanced fuzzy search that supports targeted column search
 */
const enhancedFuzzySearchMatch = (
  data: Record<string, unknown>, 
  searchTerm: string, 
  targetedSearch?: TargetedSearch | null
): boolean => {
  // If no search term and no targeted search, show all data
  if (!searchTerm && !targetedSearch) return true;
  
  // If targeted search exists but has no value, show all data
  if (targetedSearch && !targetedSearch.value.trim()) return true;
  
  // Handle targeted search with value
  if (targetedSearch && targetedSearch.value.trim()) {
    const fieldValue = getNestedValue(data, targetedSearch.field);
    if (fieldValue === null || fieldValue === undefined) return false;
    
    const stringValue = String(fieldValue).toLowerCase();
    const searchValue = targetedSearch.value.toLowerCase();
    
    // Different search strategies based on column type
    switch (targetedSearch.column.type) {
      case 'number':
      case 'currency':
        // Exact match for numbers
        return stringValue.includes(searchValue);
      case 'date':
        // Date matching (could be enhanced with date parsing)
        return stringValue.includes(searchValue);
      default:
        // Fuzzy match for text
        return fuzzyMatch(stringValue, searchValue);
    }
  }
  
  // Handle global search
  if (searchTerm && searchTerm.trim()) {
    return fuzzySearchMatch(data, searchTerm);
  }
  
  return true;
};

/**
 * Get nested value from object using dot notation (e.g., "category.name")
 */
const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
};

/**
 * Simple fuzzy match function for targeted search
 */
const fuzzyMatch = (text: string, pattern: string): boolean => {
  const lowerText = text.toLowerCase();
  const lowerPattern = pattern.toLowerCase();
  let tIdx = 0;
  let pIdx = 0;
  while (tIdx < lowerText.length && pIdx < lowerPattern.length) {
    if (lowerText[tIdx] === lowerPattern[pIdx]) {
      pIdx++;
    }
    tIdx++;
  }
  return pIdx === lowerPattern.length;
};

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
    initialSearch = "",
    useFuzzySearch = true,
    columns,
  } = options;

  const [search, _setSearch] = useState(initialSearch);
  const [globalSearch, setGlobalSearch] = useState("");
  const [targetedSearch, setTargetedSearch] = useState<TargetedSearch | null>(null);
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
          (currentTargetedSearch && currentTargetedSearch.value.trim().length > 0)
        );
      }
    : undefined;

  const doesExternalFilterPass = useFuzzySearch
    ? (node: { data: Record<string, unknown> }) => {
        const currentGlobalSearch = globalSearchRef.current;
        const currentTargetedSearch = targetedSearchRef.current;
        
        return enhancedFuzzySearchMatch(
          node.data, 
          currentGlobalSearch, 
          currentTargetedSearch
        );
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

  const handleTargetedSearch = useCallback((newTargetedSearch: TargetedSearch | null) => {
    const prevTargetedSearch = targetedSearchRef.current;
    setTargetedSearch(newTargetedSearch);
    
    // Clear global search when targeted search is active
    if (newTargetedSearch) {
      setGlobalSearch("");
    }

    // Use setTimeout to ensure state updates are processed before refreshing
    setTimeout(() => {
      if (gridRef.current && useFuzzySearch) {
        gridRef.current.onFilterChanged();
      }
    }, 0);

    // Special handling: when targeted search value changes from non-empty to empty
    if (prevTargetedSearch && newTargetedSearch && 
        prevTargetedSearch.value.trim() && !newTargetedSearch.value.trim()) {
      // Force refresh multiple times to ensure AG Grid shows all data
      setTimeout(() => {
        if (gridRef.current && useFuzzySearch) {
          gridRef.current.onFilterChanged();
        }
      }, 10);
      setTimeout(() => {
        if (gridRef.current && useFuzzySearch) {
          gridRef.current.onFilterChanged();
        }
      }, 50);
    }
  }, [useFuzzySearch]);

  const handleGlobalSearch = useCallback((newGlobalSearch: string) => {
    setGlobalSearch(newGlobalSearch);
    
    if (gridRef.current) {
      if (useFuzzySearch) {
        gridRef.current.onFilterChanged();
      } else {
        gridRef.current.setGridOption("quickFilterText", newGlobalSearch);
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
  }, [enableDebouncedSearch, onDebouncedSearchChange, useFuzzySearch]);

  const clearSearch = useCallback(() => {
    setSearch("");
    setGlobalSearch("");
    setTargetedSearch(null);
    
    if (gridRef.current) {
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
    targetedSearch,
    handleTargetedSearch,
    handleGlobalSearch,
    searchColumns: columns,
  };
};