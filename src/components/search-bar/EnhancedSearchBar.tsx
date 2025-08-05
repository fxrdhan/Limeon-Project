import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { LuSearch, LuHash, LuX, LuFilter } from 'react-icons/lu';
import { PiKeyReturnBold } from 'react-icons/pi';
import fuzzysort from 'fuzzysort';
import {
  EnhancedSearchBarProps,
  SearchColumn,
  EnhancedSearchState,
} from '@/types/search';
import ColumnSelector from './ColumnSelector';
import OperatorSelector, { DEFAULT_FILTER_OPERATORS, FilterOperator } from './OperatorSelector';

const EnhancedSearchBar: React.FC<EnhancedSearchBarProps> = ({
  value,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  placeholder = 'Cari...',
  className = '',
  inputRef,
  searchState = 'idle',
  resultsCount,
  columns,
  onGlobalSearch,
  onClearSearch,
  onFilterSearch,
}) => {
  const [searchMode, setSearchMode] = useState<EnhancedSearchState>({
    showColumnSelector: false,
    showOperatorSelector: false,
    isFilterMode: false,
  });
  const [columnSelectorPosition, setColumnSelectorPosition] = useState({
    top: 0,
    left: 0,
  });
  const [operatorSelectorPosition, setOperatorSelectorPosition] = useState({
    top: 0,
    left: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const textMeasureRef = useRef<HTMLSpanElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const badgesContainerRef = useRef<HTMLDivElement>(null);
  const [textWidth, setTextWidth] = useState(0);
  const [badgeWidth, setBadgeWidth] = useState(0);

  // Memoize columns to prevent parseSearchValue recreation
  const memoizedColumns = useMemo(() => columns, [columns]);
  
  // Parse search value to detect targeted search and filter mode
  const parseSearchValue = useCallback(
    (searchValue: string) => {
      // Handle special case for hashtag-only input
      if (searchValue === '#') {
        return {
          globalSearch: undefined,
          showColumnSelector: true,
          showOperatorSelector: false,
          isFilterMode: false,
        };
      }

      if (searchValue.startsWith('#')) {
        // Check for colon pattern: #column:value
        if (searchValue.includes(':')) {
          const colonMatch = searchValue.match(/^#([^:]+):(.*)$/);
          if (colonMatch) {
            const [, columnInput, searchTerm] = colonMatch;
            
            // Find the column
            const column = memoizedColumns.find(
              col =>
                col.field.toLowerCase() === columnInput.toLowerCase() ||
                col.headerName.toLowerCase() === columnInput.toLowerCase()
            );

            if (column) {
              // Check if user typed # after colon to switch to operator selection
              if (searchTerm === '#') {
                return {
                  globalSearch: undefined,
                  showColumnSelector: false,
                  showOperatorSelector: true,
                  isFilterMode: false,
                  selectedColumn: column,
                };
              }
              
              // Convert #column:value directly to filter mode with 'contains' operator
              return {
                globalSearch: undefined,
                showColumnSelector: false,
                showOperatorSelector: false,
                isFilterMode: true,
                filterSearch: {
                  field: column.field,
                  value: searchTerm,
                  column,
                  operator: 'contains',
                },
              };
            }
          }
        }

        // Check for space pattern: #column #operator value
        const filterMatch = searchValue.match(/^#([^\s:]+)(?:\s+#([^\s:]+)(?:\s+(.*))?)?$/);
        
        if (filterMatch) {
          const [, columnInput, operatorInput, filterValue] = filterMatch;

          // Find the column
          const column = memoizedColumns.find(
            col =>
              col.field.toLowerCase() === columnInput.toLowerCase() ||
              col.headerName.toLowerCase() === columnInput.toLowerCase()
          );

          if (column) {
            // Check for different patterns
            if (operatorInput) {
              // Pattern: #column #operator or #column #operator value
              const operator = DEFAULT_FILTER_OPERATORS.find(
                op => op.value.toLowerCase() === operatorInput.toLowerCase()
              );

              if (operator) {
                // Full filter mode: #column #operator value
                return {
                  globalSearch: undefined,
                  showColumnSelector: false,
                  showOperatorSelector: false,
                  isFilterMode: true,
                  filterSearch: {
                    field: column.field,
                    value: filterValue || '',
                    column,
                    operator: operator.value,
                  },
                };
              } else {
                // Show operator selector: #column #unknown
                return {
                  globalSearch: undefined,
                  showColumnSelector: false,
                  showOperatorSelector: true,
                  isFilterMode: false,
                  selectedColumn: column,
                };
              }
            } else if (searchValue.includes(' #')) {
              // Pattern: #column # (space before second #)
              return {
                globalSearch: undefined,
                showColumnSelector: false,
                showOperatorSelector: true,
                isFilterMode: false,
                selectedColumn: column,
              };
            } else {
              // Pattern: #column (column selected, ready for : or space #)
              return {
                globalSearch: undefined,
                showColumnSelector: false,
                showOperatorSelector: false,
                isFilterMode: false,
                selectedColumn: column,
              };
            }
          }
        }

        // Show column selector while typing after #
        return {
          globalSearch: undefined,
          showColumnSelector: true,
          showOperatorSelector: false,
          isFilterMode: false,
        };
      }

      return {
        globalSearch: searchValue,
        showColumnSelector: false,
        showOperatorSelector: false,
        isFilterMode: false,
      };
    },
    [memoizedColumns]
  );

  // Track previous value for comparison
  const prevValueRef = useRef<string>('');
  
  // Debounce timer for purple badge AG Grid updates
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Store callbacks in refs to avoid dependency issues
  const onGlobalSearchRef = useRef(onGlobalSearch);
  const onFilterSearchRef = useRef(onFilterSearch);

  // Update refs when callbacks change
  useEffect(() => {
    onGlobalSearchRef.current = onGlobalSearch;
    onFilterSearchRef.current = onFilterSearch;
  });

  // Debounced AG Grid update function for purple badge smoothness
  const debouncedFilterUpdate = useCallback((filterSearch: {
    field: string;
    value: string;
    column: SearchColumn;
    operator: string;
  }) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer - only update AG Grid after user stops typing
    debounceTimerRef.current = setTimeout(() => {
      onFilterSearchRef.current?.(filterSearch);
      onGlobalSearchRef.current?.('');
    }, 150); // 150ms delay for smooth UX
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Update search mode when value changes - OPTIMIZED for purple badge smoothness
  useEffect(() => {
    const newMode = parseSearchValue(value);
    setSearchMode(newMode);

    // Helper function to check if value is hashtag mode
    const isHashtagMode = (searchValue: string) => {
      return (
        searchValue === '#' ||
        (searchValue.startsWith('#') && !searchValue.includes(':'))
      );
    };

    // Layer: Empty State Cleanup - When searchbar is completely empty
    if (value === '' || value.trim() === '') {
      // Clear all search states when searchbar is empty
      onGlobalSearchRef.current?.('');
      onFilterSearchRef.current?.(null);
      return;
    }

    // OPTIMIZED: Only trigger callbacks for meaningful state changes, not every character
    const previousValue = prevValueRef.current;
    const hasStateChanged = value !== previousValue;
    
    if (!hasStateChanged) return;

    // Purple badge DEBOUNCED updates - ZERO flickering like unified mode
    if (newMode.isFilterMode && newMode.filterSearch) {
      const filterValue = newMode.filterSearch.value.trim();
      
      if (filterValue === '') {
        // Immediate clear when empty - cancel any pending debounced updates
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        onFilterSearchRef.current?.(null);
        onGlobalSearchRef.current?.('');
      } else {
        // Use debounced update - NO immediate AG Grid calls, ZERO flickering
        debouncedFilterUpdate(newMode.filterSearch);
      }
    } else if (
      !newMode.showColumnSelector &&
      !newMode.showOperatorSelector &&
      !newMode.isFilterMode &&
      newMode.globalSearch !== undefined &&
      newMode.globalSearch.trim() !== '' &&
      !isHashtagMode(newMode.globalSearch)
    ) {
      // Global search mode
      onGlobalSearchRef.current?.(newMode.globalSearch);
      onFilterSearchRef.current?.(null);
    } else if (newMode.showColumnSelector || newMode.showOperatorSelector) {
      // When in selector mode, clear any existing search
      onGlobalSearchRef.current?.('');
      onFilterSearchRef.current?.(null);
    }

    // Update previous value reference
    prevValueRef.current = value;
  }, [value, parseSearchValue, debouncedFilterUpdate]);

  // Update column selector position
  useEffect(() => {
    const updatePosition = () => {
      if (searchMode.showColumnSelector && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setColumnSelectorPosition({
          top: rect.bottom,
          left: rect.left,
        });
      }
    };

    // Initial position update
    updatePosition();

    if (searchMode.showColumnSelector) {
      // Add event listeners for dynamic positioning
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true); // Use capture to catch all scroll events
      document.addEventListener('scroll', handleScroll, true);

      // Use ResizeObserver for container size changes
      let resizeObserver: ResizeObserver | null = null;
      if (containerRef.current && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(updatePosition);
        resizeObserver.observe(containerRef.current);
      }

      // Cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
        document.removeEventListener('scroll', handleScroll, true);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    }
  }, [searchMode.showColumnSelector]);

  // Update operator selector position
  useEffect(() => {
    const updatePosition = () => {
      if (searchMode.showOperatorSelector && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setOperatorSelectorPosition({
          top: rect.bottom,
          left: rect.left,
        });
      }
    };

    // Initial position update
    updatePosition();

    if (searchMode.showOperatorSelector) {
      // Add event listeners for dynamic positioning
      const handleResize = () => updatePosition();
      const handleScroll = () => updatePosition();

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll, true);
      document.addEventListener('scroll', handleScroll, true);

      // Use ResizeObserver for container size changes
      let resizeObserver: ResizeObserver | null = null;
      if (containerRef.current && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(updatePosition);
        resizeObserver.observe(containerRef.current);
      }

      // Cleanup function
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll, true);
        document.removeEventListener('scroll', handleScroll, true);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    }
  }, [searchMode.showOperatorSelector]);

  const handleColumnSelect = useCallback(
    (column: SearchColumn) => {
      // Use legacy pattern for smooth UX: #column:
      const newValue = `#${column.field}:`;
      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);
      setSearchMode(prev => ({ ...prev, showColumnSelector: false }));

      // Focus back to input
      setTimeout(() => {
        inputRef?.current?.focus();
      }, 0);
    },
    [onChange, inputRef]
  );

  const handleOperatorSelect = useCallback(
    (operator: FilterOperator) => {
      // Extract column from current value
      const columnMatch = value.match(/^#([^:\s]+)/);
      if (columnMatch) {
        const columnName = columnMatch[1];
        // Pattern: #column #operator 
        const newValue = `#${columnName} #${operator.value} `;
        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
        setSearchMode(prev => ({ ...prev, showOperatorSelector: false }));

        // Focus back to input
        setTimeout(() => {
          inputRef?.current?.focus();
        }, 0);
      }
    },
    [value, onChange, inputRef]
  );

  const handleCloseColumnSelector = useCallback(() => {
    // Just close the column selector without clearing the input
    setSearchMode(prev => ({ ...prev, showColumnSelector: false }));
  }, []);

  const handleCloseOperatorSelector = useCallback(() => {
    // Just close the operator selector without clearing the input
    setSearchMode(prev => ({ ...prev, showOperatorSelector: false }));
  }, []);

  const handleClearTargeted = useCallback(() => {
    if (searchMode.isFilterMode && searchMode.filterSearch) {
      if (searchMode.filterSearch.operator === 'contains') {
        // Colon pattern: clear completely
        if (onClearSearch) {
          onClearSearch();
        } else {
          onChange({
            target: { value: '' },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      } else {
        // Space pattern: only clear operator, keep column (return to colon pattern)
        const columnName = searchMode.filterSearch.field;
        const newValue = `#${columnName}:`;
        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
        
        // Focus back to input for continuing with value input
        setTimeout(() => {
          inputRef?.current?.focus();
        }, 0);
      }
    } else {
      // Fallback: clear completely
      if (onClearSearch) {
        onClearSearch();
      } else {
        onChange({
          target: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  }, [searchMode, onClearSearch, onChange, inputRef]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      if (searchMode.isFilterMode && searchMode.filterSearch) {
        if (searchMode.filterSearch.operator === 'contains') {
          // Colon pattern: update the value part after #column:
          const columnName = searchMode.filterSearch.field;
          const newValue = `#${columnName}:${inputValue}`;
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        } else {
          // Space pattern: update the value part after #column #operator
          const columnName = searchMode.filterSearch.field;
          const operatorName = searchMode.filterSearch.operator;
          const newValue = `#${columnName} #${operatorName} ${inputValue}`;
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      } else {
        // For normal search or selector modes
        onChange(e);

        // If user clears the # character, also close selectors
        if (!inputValue.startsWith('#')) {
          if (searchMode.showColumnSelector) {
            setSearchMode(prev => ({ ...prev, showColumnSelector: false }));
          }
          if (searchMode.showOperatorSelector) {
            setSearchMode(prev => ({ ...prev, showOperatorSelector: false }));
          }
        }
      }
    },
    [searchMode, onChange]
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      try {
        // Handle escape to close selectors or clear search
        if (e.key === 'Escape') {
          if (searchMode.showColumnSelector) {
            // Just close the column selector without clearing input
            setSearchMode(prev => ({ ...prev, showColumnSelector: false }));
            return;
          } else if (searchMode.showOperatorSelector) {
            // Just close the operator selector without clearing input
            setSearchMode(prev => ({ ...prev, showOperatorSelector: false }));
            return;
          } else if (value && onClearSearch) {
            // Clear search when Escape is pressed and there's a search value
            onClearSearch();
            return;
          }
        }

        // Handle backspace to clear searches
        if (e.key === 'Backspace') {
          if (searchMode.isFilterMode && searchMode.filterSearch?.value === '') {
            if (searchMode.filterSearch.operator === 'contains') {
              // Colon pattern with empty value: clear completely
              if (onClearSearch) {
                onClearSearch();
              } else {
                onChange({
                  target: { value: '' },
                } as React.ChangeEvent<HTMLInputElement>);
              }
              return;
            } else {
              // Space pattern with empty value: remove operator, keep column (return to colon pattern)
              const columnName = searchMode.filterSearch.field;
              const newValue = `#${columnName}:`;
              onChange({
                target: { value: newValue },
              } as React.ChangeEvent<HTMLInputElement>);
              return;
            }
          }
        }

        // Handle Tab key to navigate through selectors
        if (
          (searchMode.showColumnSelector || searchMode.showOperatorSelector) &&
          (e.key === 'Tab' ||
            e.key === 'ArrowDown' ||
            e.key === 'ArrowUp' ||
            e.key === 'Enter')
        ) {
          // Let the selectors handle these keys
          return;
        }

        onKeyDown?.(e);
      } catch (error) {
        console.error('Error in handleInputKeyDown:', error);
        // Fallback: still call the original onKeyDown if it exists
        onKeyDown?.(e);
      }
    },
    [searchMode, onChange, onKeyDown, onClearSearch, value]
  );

  const getSearchIconColor = () => {
    if (searchMode.isFilterMode && searchMode.filterSearch?.operator === 'contains') return 'text-purple-500';
    if (searchMode.isFilterMode) return 'text-blue-500';

    switch (searchState) {
      case 'idle':
        return 'text-gray-400';
      case 'typing':
        return 'text-gray-800';
      case 'found':
        return 'text-primary';
      case 'not-found':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  const getSearchIcon = () => {
    if (searchMode.isFilterMode && searchMode.filterSearch?.operator === 'contains') {
      return (
        <LuHash
          className={`${getSearchIconColor()} transition-all duration-300`}
        />
      );
    }
    if (searchMode.isFilterMode) {
      return (
        <LuFilter
          className={`${getSearchIconColor()} transition-all duration-300`}
        />
      );
    }
    return (
      <LuSearch
        className={`${getSearchIconColor()} transition-all duration-300`}
      />
    );
  };

  const hasValue = value && value.length > 0;
  
  // Memoize showTargetedIndicator to prevent unnecessary recalculations
  const showTargetedIndicator = useMemo(() => 
    (searchMode.isFilterMode && !!searchMode.filterSearch) ||
    (searchMode.showOperatorSelector && !!searchMode.selectedColumn),
    [searchMode.isFilterMode, searchMode.filterSearch, searchMode.showOperatorSelector, searchMode.selectedColumn]
  );

  // Get display value (hide #column: and #column #operator syntax from user) - memoized to prevent flickering
  const displayValue = useMemo(() => {
    if (searchMode.isFilterMode && searchMode.filterSearch) {
      return searchMode.filterSearch.value;
    }
    if (searchMode.showOperatorSelector && searchMode.selectedColumn) {
      // Hide input during operator selection since badge is showing
      return '';
    }
    if (value.startsWith('#') && !searchMode.isFilterMode) {
      // Keep the full hashtag input visible for better UX during selection
      return value;
    }
    return value;
  }, [value, searchMode.isFilterMode, searchMode.filterSearch, searchMode.showOperatorSelector, searchMode.selectedColumn]);

  // Calculate text width for return icon positioning
  useEffect(() => {
    if (textMeasureRef.current && displayValue) {
      setTextWidth(textMeasureRef.current.offsetWidth);
    }
  }, [displayValue]);

  // Calculate badge width for dynamic padding - immediate calculation
  useEffect(() => {
    if (showTargetedIndicator) {
      if (searchMode.isFilterMode && searchMode.filterSearch && badgesContainerRef.current) {
        // For filter mode: calculate total width of both badges + gap
        setBadgeWidth(badgesContainerRef.current.offsetWidth);
      } else if (badgeRef.current) {
        // For single badge mode: single badge width
        setBadgeWidth(badgeRef.current.offsetWidth);
      }
    } else {
      setBadgeWidth(0);
    }
  }, [showTargetedIndicator, searchMode.isFilterMode, searchMode.filterSearch]);

  // Get column selector search term - compute directly for immediate update
  const searchTerm = useMemo(() => {
    if (value.startsWith('#')) {
      const match = value.match(/^#([^:]*)/);
      return match ? match[1] : '';
    }
    return '';
  }, [value]);

  // Pre-prepare searchable columns for better performance
  const searchableColumns = useMemo(() => {
    return columns.filter(col => col.searchable);
  }, [columns]);

  // Sort columns using fuzzysort library
  const sortedColumns = useMemo(() => {
    if (!searchTerm) return searchableColumns;

    // Prepare search targets for fuzzysort
    const searchTargets = searchableColumns.map(col => ({
      column: col,
      headerName: col.headerName,
      field: col.field,
      description: col.description || '',
    }));

    // Search header names (highest priority)
    const headerResults = fuzzysort.go(searchTerm, searchTargets, {
      key: 'headerName',
      threshold: -1000,
    });

    // Search field names (medium priority)
    const fieldResults = fuzzysort.go(searchTerm, searchTargets, {
      key: 'field',
      threshold: -1000,
    });

    // Search descriptions (lowest priority)
    const descResults = fuzzysort.go(searchTerm, searchTargets, {
      key: 'description',
      threshold: -1000,
    });

    // Combine results with priority scoring
    const combinedResults = new Map();

    headerResults.forEach(result => {
      combinedResults.set(result.obj.column.field, {
        column: result.obj.column,
        score: result.score + 1000, // Boost header matches
      });
    });

    fieldResults.forEach(result => {
      if (!combinedResults.has(result.obj.column.field)) {
        combinedResults.set(result.obj.column.field, {
          column: result.obj.column,
          score: result.score + 500, // Medium boost
        });
      }
    });

    descResults.forEach(result => {
      if (!combinedResults.has(result.obj.column.field)) {
        combinedResults.set(result.obj.column.field, {
          column: result.obj.column,
          score: result.score, // No boost
        });
      }
    });

    // Sort by score and return columns
    return Array.from(combinedResults.values())
      .sort((a, b) => b.score - a.score)
      .map(item => item.column);
  }, [searchableColumns, searchTerm]);

  // Get dynamic placeholder based on search mode
  const getPlaceholder = () => {
    if (showTargetedIndicator) {
      return 'Cari...';
    }
    return placeholder;
  };

  return (
    <>
      <div ref={containerRef} className={`mb-2 relative ${className}`}>
        <div className="flex items-center">
          {/* Dynamic search icon */}
          <div
            className={`transition-all duration-300 ease-in-out ${
              displayValue
                ? 'opacity-100 transform translate-x-0 scale-150 pl-2'
                : 'opacity-0 transform -translate-x-2 scale-100'
            }`}
            style={{
              visibility: displayValue ? 'visible' : 'hidden',
              width: displayValue ? 'auto' : '0',
              minWidth: displayValue ? '40px' : '0',
            }}
          >
            {getSearchIcon()}
          </div>

          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              placeholder={getPlaceholder()}
              className={`text-sm outline-none tracking-normal w-full p-2.5 border transition-all duration-300 ease-in-out ${
                searchState === 'not-found'
                  ? 'border-danger focus:border-danger focus:ring-3 focus:ring-red-100'
                  : searchMode.isFilterMode && searchMode.filterSearch && searchMode.filterSearch.operator === 'contains'
                    ? 'border-purple-300 ring-3 ring-purple-100 focus:border-purple-500 focus:ring-3 focus:ring-purple-100'
                    : searchMode.isFilterMode && searchMode.filterSearch
                      ? 'border-purple-300 ring-3 ring-purple-100 focus:border-purple-500 focus:ring-3 focus:ring-purple-100'
                      : searchMode.showColumnSelector
                        ? 'border-purple-300 ring-3 ring-purple-100 focus:border-purple-500 focus:ring-3 focus:ring-purple-100'
                        : 'border-gray-300 focus:border-primary focus:ring-3 focus:ring-emerald-200'
              } focus:outline-none rounded-lg`}
              style={{
                paddingLeft: showTargetedIndicator
                  ? `${badgeWidth + 24}px` // Dynamic padding based on badge width + 24px margin
                  : displayValue
                    ? '12px'
                    : '40px',
              }}
              value={displayValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={onFocus}
              onBlur={onBlur}
            />

            {/* Search indicator - inline badge */}
            {showTargetedIndicator && (
              <div 
                ref={badgesContainerRef}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10 flex items-center gap-2"
              >
                {searchMode.isFilterMode && searchMode.filterSearch ? (
                  searchMode.filterSearch.operator === 'contains' ? (
                    // Colon pattern: Single purple badge with X button (maintains targeted search UX)
                    <div
                      ref={badgeRef}
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700"
                    >
                      <span>{searchMode.filterSearch.column.headerName}</span>
                      <button
                        onClick={handleClearTargeted}
                        className="rounded-sm p-0.5 transition-colors hover:bg-purple-200"
                        type="button"
                      >
                        <LuX className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    // Space pattern: Two separate badges
                    <>
                      {/* Column badge (purple, no X button) */}
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700">
                        <span>{searchMode.filterSearch.column.headerName}</span>
                      </div>
                      
                      {/* Operator badge (blue, with X button) */}
                      <div
                        ref={badgeRef}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700"
                      >
                        <span>
                          {DEFAULT_FILTER_OPERATORS.find(op => op.value === searchMode.filterSearch!.operator)?.label}
                        </span>
                        <button
                          onClick={handleClearTargeted}
                          className="rounded-sm p-0.5 transition-colors hover:bg-blue-200"
                          type="button"
                        >
                          <LuX className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )
                ) : searchMode.showOperatorSelector && searchMode.selectedColumn ? (
                  // Operator selection mode: Single purple badge (no X button during selection)
                  <div
                    ref={badgeRef}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700"
                  >
                    <span>{searchMode.selectedColumn.headerName}</span>
                  </div>
                ) : null}
              </div>
            )}

            {/* Static search icon (when no value) */}
            {!showTargetedIndicator && (
              <div
                className={`absolute top-3.5 transition-all duration-300 ease-in-out ${
                  displayValue
                    ? 'opacity-0 transform translate-x-2 left-3'
                    : 'opacity-100 transform translate-x-0 left-3'
                }`}
                style={{
                  visibility: displayValue ? 'hidden' : 'visible',
                }}
              >
                {getSearchIcon()}
              </div>
            )}

            {/* Text width measurement */}
            <span
              ref={textMeasureRef}
              className="absolute invisible whitespace-nowrap text-sm"
              style={{
                left: showTargetedIndicator
                  ? `${badgeWidth + 24}px` // Dynamic position based on badge width + margin
                  : hasValue
                    ? '18px'
                    : '10px',
                padding: '10px',
              }}
            >
              {displayValue}
            </span>

            {/* Return key icon */}
            <PiKeyReturnBold
              className={`absolute top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none ml-1 transition-all duration-300 ease-in-out ${
                searchState === 'not-found' && displayValue
                  ? 'opacity-100 scale-150 translate-x-0'
                  : 'opacity-0 scale-95 translate-x-2'
              }`}
              style={{
                left: `${textWidth + (showTargetedIndicator ? badgeWidth + 24 : displayValue ? 0 : 10)}px`,
              }}
            />
          </div>
        </div>

        {/* Results count */}
        {resultsCount !== undefined && searchState === 'found' && (
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <LuSearch className="w-3 h-3" />
            <span>{resultsCount} hasil ditemukan</span>
          </div>
        )}
      </div>

      {/* Column Selector Modal */}
      <ColumnSelector
        columns={sortedColumns}
        isOpen={searchMode.showColumnSelector}
        onSelect={handleColumnSelect}
        onClose={handleCloseColumnSelector}
        position={columnSelectorPosition}
        searchTerm={searchTerm}
      />

      {/* Operator Selector Modal */}
      <OperatorSelector
        operators={DEFAULT_FILTER_OPERATORS}
        isOpen={searchMode.showOperatorSelector}
        onSelect={handleOperatorSelect}
        onClose={handleCloseOperatorSelector}
        position={operatorSelectorPosition}
      />
    </>
  );
};

export default EnhancedSearchBar;
