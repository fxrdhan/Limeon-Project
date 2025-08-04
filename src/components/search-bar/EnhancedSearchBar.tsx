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
  onTargetedSearch,
  onGlobalSearch,
  onClearSearch,
  onFilterSearch,
}) => {
  const [searchMode, setSearchMode] = useState<EnhancedSearchState>({
    isTargeted: false,
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

  // Parse search value to detect targeted search and filter mode
  const parseSearchValue = useCallback(
    (searchValue: string) => {
      // Handle special case for hashtag-only input
      if (searchValue === '#') {
        return {
          isTargeted: false,
          globalSearch: undefined,
          showColumnSelector: true,
          showOperatorSelector: false,
          isFilterMode: false,
        };
      }

      if (searchValue.startsWith('#')) {
        // Check for legacy pattern first: #column:value
        if (searchValue.includes(':')) {
          const legacyMatch = searchValue.match(/^#([^:]+):(.*)$/);
          if (legacyMatch) {
            const [, columnInput, searchTerm] = legacyMatch;
            
            // Find the column
            const column = columns.find(
              col =>
                col.field.toLowerCase() === columnInput.toLowerCase() ||
                col.headerName.toLowerCase() === columnInput.toLowerCase()
            );

            if (column) {
              // Check if user typed # after colon to switch to filter mode
              if (searchTerm === '#') {
                return {
                  isTargeted: false,
                  globalSearch: undefined,
                  showColumnSelector: false,
                  showOperatorSelector: true,
                  isFilterMode: false,
                  selectedColumn: column,
                };
              }
              
              return {
                isTargeted: true,
                targetedSearch: {
                  field: column.field,
                  value: searchTerm,
                  column,
                },
                globalSearch: undefined,
                showColumnSelector: false,
                showOperatorSelector: false,
                isFilterMode: false,
              };
            }
          }
        }

        // Check for new pattern: #column #operator value
        const filterMatch = searchValue.match(/^#([^\s:]+)(?:\s+#([^\s:]+)(?:\s+(.*))?)?$/);
        
        if (filterMatch) {
          const [, columnInput, operatorInput, filterValue] = filterMatch;

          // Find the column
          const column = columns.find(
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
                  isTargeted: false,
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
                  isTargeted: false,
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
                isTargeted: false,
                globalSearch: undefined,
                showColumnSelector: false,
                showOperatorSelector: true,
                isFilterMode: false,
                selectedColumn: column,
              };
            } else {
              // Pattern: #column (column selected, ready for : or space #)
              return {
                isTargeted: false,
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
          isTargeted: false,
          globalSearch: undefined,
          showColumnSelector: true,
          showOperatorSelector: false,
          isFilterMode: false,
        };
      }

      return {
        isTargeted: false,
        globalSearch: searchValue,
        showColumnSelector: false,
        showOperatorSelector: false,
        isFilterMode: false,
      };
    },
    [columns]
  );

  // Track previous value for comparison
  const prevValueRef = useRef<string>('');

  // Update search mode when value changes
  useEffect(() => {
    const newMode = parseSearchValue(value);
    const prevMode = parseSearchValue(prevValueRef.current);
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
      onTargetedSearch?.(null);
      onGlobalSearch?.('');
      onFilterSearch?.(null); // Auto-clear AG Grid filters when searchbar is empty
      return; // Early return to prevent other callbacks
    }

    // Trigger callbacks based on mode
    if (newMode.isFilterMode && newMode.filterSearch) {
      // Filter mode - use AG Grid filter API, but only when there's a value to filter
      if (newMode.filterSearch.value.trim() !== '') {
        onFilterSearch?.(newMode.filterSearch);
        onTargetedSearch?.(null);
        onGlobalSearch?.('');
      } else {
        // Clear filters when value is empty (wait for user input)
        onFilterSearch?.(null);
        onTargetedSearch?.(null);
        onGlobalSearch?.('');
      }
    } else if (newMode.isTargeted && newMode.targetedSearch) {
      // Legacy targeted search mode
      onTargetedSearch?.(newMode.targetedSearch);
      onGlobalSearch?.('');
      onFilterSearch?.(null);
    } else if (
      !newMode.isTargeted &&
      !newMode.showColumnSelector &&
      !newMode.showOperatorSelector &&
      !newMode.isFilterMode &&
      newMode.globalSearch !== undefined &&
      newMode.globalSearch.trim() !== '' &&
      !isHashtagMode(newMode.globalSearch) // Explicit hashtag mode check
    ) {
      // Global search mode
      onTargetedSearch?.(null);
      onGlobalSearch?.(newMode.globalSearch);
      onFilterSearch?.(null);
    } else if (newMode.showColumnSelector || newMode.showOperatorSelector) {
      // When in selector mode, clear any existing search
      onTargetedSearch?.(null);
      onGlobalSearch?.('');
      onFilterSearch?.(null);
    }

    // Force immediate refresh when targeted search value changes
    if (
      prevMode.isTargeted &&
      prevMode.targetedSearch &&
      newMode.isTargeted &&
      newMode.targetedSearch &&
      prevMode.targetedSearch.value !== newMode.targetedSearch.value
    ) {
      // Double trigger to ensure AG Grid refreshes properly
      setTimeout(() => {
        onTargetedSearch?.(newMode.targetedSearch);
      }, 10);
    }

    // Update previous value reference
    prevValueRef.current = value;
  }, [value, parseSearchValue, onTargetedSearch, onGlobalSearch, onFilterSearch]);

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
      // In filter mode: only clear operator, keep column (return to targeted search)
      const columnName = searchMode.filterSearch.field;
      const newValue = `#${columnName}:`;
      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);
      
      // Focus back to input for continuing with value input
      setTimeout(() => {
        inputRef?.current?.focus();
      }, 0);
    } else {
      // In targeted search mode: clear completely
      if (onClearSearch) {
        // Use the comprehensive clear function if provided
        onClearSearch();
      } else {
        // Fall back to the original behavior
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
        // If in filter mode, update the value part after #column #operator
        const columnName = searchMode.filterSearch.field;
        const operatorName = searchMode.filterSearch.operator;
        const newValue = `#${columnName} #${operatorName} ${inputValue}`;
        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
      } else if (searchMode.isTargeted && searchMode.targetedSearch) {
        // If in targeted mode, update the value part after the colon
        const newValue = `#${searchMode.targetedSearch.field}:${inputValue}`;
        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);

        // Force refresh when value becomes empty to immediately show all data
        if (inputValue === '' && searchMode.targetedSearch.value !== '') {
          setTimeout(() => {
            const emptyTargetedSearch = {
              field: searchMode.targetedSearch!.field,
              value: '',
              column: searchMode.targetedSearch!.column,
            };
            onTargetedSearch?.(emptyTargetedSearch);
          }, 0);
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
    [searchMode, onChange, onTargetedSearch]
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
            // In filter mode with empty value: remove operator, keep column (return to targeted search)
            const columnName = searchMode.filterSearch.field;
            const newValue = `#${columnName}:`;
            onChange({
              target: { value: newValue },
            } as React.ChangeEvent<HTMLInputElement>);
            return;
          } else if (searchMode.isTargeted && searchMode.targetedSearch?.value === '') {
            // Clear targeted search when value is empty
            if (onClearSearch) {
              onClearSearch();
            } else {
              onChange({
                target: { value: '' },
              } as React.ChangeEvent<HTMLInputElement>);
            }
            return;
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
    if (searchMode.isFilterMode) return 'text-blue-500';
    if (searchMode.isTargeted) return 'text-purple-500';

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
    if (searchMode.isFilterMode) {
      return (
        <LuFilter
          className={`${getSearchIconColor()} transition-all duration-300`}
        />
      );
    }
    if (searchMode.isTargeted) {
      return (
        <LuHash
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
  const showTargetedIndicator =
    (searchMode.isTargeted && searchMode.targetedSearch) ||
    (searchMode.isFilterMode && searchMode.filterSearch) ||
    (searchMode.showOperatorSelector && searchMode.selectedColumn);

  // Get display value (hide #column: and #column #operator syntax from user)
  const getDisplayValue = useCallback(() => {
    if (searchMode.isFilterMode && searchMode.filterSearch) {
      return searchMode.filterSearch.value;
    }
    if (searchMode.isTargeted && searchMode.targetedSearch) {
      return searchMode.targetedSearch.value;
    }
    if (searchMode.showOperatorSelector && searchMode.selectedColumn) {
      // Hide input during operator selection since badge is showing
      return '';
    }
    if (value.startsWith('#') && !searchMode.isTargeted && !searchMode.isFilterMode) {
      // Keep the full hashtag input visible for better UX during selection
      return value;
    }
    return value;
  }, [value, searchMode]);

  const displayValue = getDisplayValue();

  // Calculate text width for return icon positioning
  useEffect(() => {
    if (textMeasureRef.current && displayValue) {
      setTextWidth(textMeasureRef.current.offsetWidth);
    }
  }, [displayValue]);

  // Calculate badge width for dynamic padding
  useEffect(() => {
    if (showTargetedIndicator) {
      if (searchMode.isFilterMode && searchMode.filterSearch && badgesContainerRef.current) {
        // For filter mode: calculate total width of both badges + gap
        setBadgeWidth(badgesContainerRef.current.offsetWidth);
      } else if (badgeRef.current) {
        // For targeted search mode: single badge width
        setBadgeWidth(badgeRef.current.offsetWidth);
      }
    }
  }, [showTargetedIndicator, searchMode.targetedSearch?.column.headerName, searchMode.isFilterMode, searchMode.filterSearch, searchMode.filterSearch?.operator]);

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
                  : searchMode.isFilterMode && searchMode.filterSearch
                    ? 'border-purple-300 ring-3 ring-purple-100 focus:border-purple-500 focus:ring-3 focus:ring-purple-100'
                    : searchMode.showColumnSelector
                      ? 'border-purple-300 ring-3 ring-purple-100 focus:border-purple-500 focus:ring-3 focus:ring-purple-100'
                      : searchMode.isTargeted
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
                  // Filter mode: Two separate badges
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
                ) : searchMode.showOperatorSelector && searchMode.selectedColumn ? (
                  // Operator selection mode: Single purple badge (no X button during selection)
                  <div
                    ref={badgeRef}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700"
                  >
                    <span>{searchMode.selectedColumn.headerName}</span>
                  </div>
                ) : (
                  // Targeted search mode: Single purple badge with X button
                  <div
                    ref={badgeRef}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700"
                  >
                    <span>{searchMode.targetedSearch?.column.headerName}</span>
                    <button
                      onClick={handleClearTargeted}
                      className="rounded-sm p-0.5 transition-colors hover:bg-purple-200"
                      type="button"
                    >
                      <LuX className="w-3 h-3" />
                    </button>
                  </div>
                )}
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
