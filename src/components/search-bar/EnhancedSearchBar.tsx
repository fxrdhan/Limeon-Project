import React, { useRef, useCallback, useMemo } from 'react';
import { LuSearch } from 'react-icons/lu';
import fuzzysort from 'fuzzysort';
import { EnhancedSearchBarProps, SearchColumn, FilterOperator } from './types';
import { SEARCH_CONSTANTS } from './constants';
import {
  DEFAULT_FILTER_OPERATORS,
  NUMBER_FILTER_OPERATORS,
  JOIN_OPERATORS,
  JoinOperator,
} from './operators';
import { buildColumnValue, findColumn } from './utils/searchUtils';
import { useSearchState } from './hooks/useSearchState';
import { useSelectorPosition } from './hooks/useSelectorPosition';
import { useSearchInput } from './hooks/useSearchInput';
import { useSearchKeyboard } from './hooks/useSearchKeyboard';
import SearchBadge from './components/SearchBadge';
import SearchIcon from './components/SearchIcon';
import ColumnSelector from './components/selectors/ColumnSelector';
import OperatorSelector from './components/selectors/OperatorSelector';
import JoinOperatorSelector from './components/selectors/JoinOperatorSelector';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const memoizedColumns = useMemo(() => columns, [columns]);

  const { searchMode } = useSearchState({
    value,
    columns: memoizedColumns,
    onGlobalSearch,
    onFilterSearch,
  });

  const columnSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showColumnSelector,
    containerRef,
  });

  const operatorSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showOperatorSelector,
    containerRef,
  });

  const joinOperatorSelectorPosition = useSelectorPosition({
    isOpen: searchMode.showJoinOperatorSelector,
    containerRef,
  });

  const {
    displayValue,
    showTargetedIndicator,
    operatorSearchTerm,
    handleInputChange,
    handleHoverChange,
    badgeRef,
    badgesContainerRef,
  } = useSearchInput({
    value,
    searchMode,
    onChange,
    inputRef,
  });

  const handleColumnSelect = useCallback(
    (column: SearchColumn) => {
      const newValue = buildColumnValue(column.field, 'colon');
      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);
      // searchMode will auto-update when value changes

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
    },
    [onChange, inputRef]
  );

  const handleOperatorSelect = useCallback(
    (operator: FilterOperator) => {
      // Check if this is for second+ operator (after join)
      if (searchMode.isSecondOperator) {
        // Append operator to existing value
        // Current: #name #contains paracetamol #and #
        // Result: #name #contains paracetamol #and #contains
        const newValue = value.replace(/\s*#\s*$/, '') + ` #${operator.value} `;
        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
      } else {
        // First operator - replace everything after column
        const columnMatch = value.match(/^#([^:\s]+)/);
        if (columnMatch) {
          const columnName = columnMatch[1];
          const newValue = `#${columnName} #${operator.value} `;
          onChange({
            target: { value: newValue },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      }

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
    },
    [value, onChange, inputRef, searchMode.isSecondOperator]
  );

  const handleJoinOperatorSelect = useCallback(
    (joinOp: JoinOperator) => {
      // Remove trailing # from current value (with or without space)
      const cleanValue = value.replace(/\s*#\s*$/, '').trim();

      // Pattern: #field #operator value -> #field #operator value #and #
      const newValue = `${cleanValue} #${joinOp.value} #`;
      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
    },
    [value, onChange, inputRef]
  );

  const handleCloseColumnSelector = useCallback(() => {
    // searchMode is derived, so we close by clearing the value
    if (value.startsWith('#') && !searchMode.selectedColumn) {
      const searchTerm = value.substring(1);
      const exactMatch = findColumn(memoizedColumns, searchTerm);

      if (!exactMatch) {
        if (onClearSearch) {
          onClearSearch();
        } else {
          onChange({
            target: { value: '' },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      }
    }
  }, [
    value,
    searchMode.selectedColumn,
    memoizedColumns,
    onClearSearch,
    onChange,
  ]);

  const handleCloseOperatorSelector = useCallback(() => {
    // GUARD: Don't interfere if value is already confirmed (has ##) or in partial join state
    // This prevents this handler from clearing value when other handlers set it correctly
    if (value.includes('##') || searchMode.partialJoin) {
      return;
    }

    // searchMode is derived, so we close by modifying the value
    if (searchMode.selectedColumn) {
      const newValue = buildColumnValue(
        searchMode.selectedColumn.field,
        'plain'
      );
      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);
    } else {
      if (onClearSearch) {
        onClearSearch();
      } else {
        onChange({
          target: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>);
      }
    }
  }, [
    searchMode.selectedColumn,
    searchMode.partialJoin,
    value,
    onChange,
    onClearSearch,
  ]);

  const handleCloseJoinOperatorSelector = useCallback(() => {
    // Remove trailing "#" when closing join operator selector
    const trimmedValue = value.replace(/\s+#\s*$/, '');
    onChange({
      target: { value: trimmedValue },
    } as React.ChangeEvent<HTMLInputElement>);
  }, [value, onChange]);

  // Clear all - used by purple badge (column)
  const handleClearAll = useCallback(() => {
    if (onClearSearch) {
      onClearSearch();
    } else {
      onChange({
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  }, [onClearSearch, onChange]);

  // Clear to column only - used by blue badge (operator)
  const handleClearToColumn = useCallback(() => {
    if (searchMode.filterSearch) {
      const columnName = searchMode.filterSearch.field;
      const newValue = buildColumnValue(columnName, 'colon');
      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
    } else {
      handleClearAll();
    }
  }, [searchMode.filterSearch, onChange, inputRef, handleClearAll]);

  // Clear value only - used by gray badge (value)
  const handleClearValue = useCallback(() => {
    if (searchMode.filterSearch) {
      const columnName = searchMode.filterSearch.field;
      const operator = searchMode.filterSearch.operator;
      // Keep column and operator, clear value
      const newValue = `#${columnName} #${operator} `;
      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
    } else {
      handleClearAll();
    }
  }, [searchMode.filterSearch, onChange, inputRef, handleClearAll]);

  // Clear partial join - used by orange badge (AND/OR)
  const handleClearPartialJoin = useCallback(() => {
    if (!searchMode.filterSearch) {
      handleClearAll();
      return;
    }

    const columnName = searchMode.filterSearch.field;

    // Case 1: Confirmed multi-condition filter (after ENTER)
    if (
      searchMode.filterSearch.isMultiCondition &&
      searchMode.filterSearch.conditions &&
      searchMode.filterSearch.conditions.length >= 1
    ) {
      const firstCondition = searchMode.filterSearch.conditions[0];
      // Back to confirmed single-condition: #field #operator value##
      const newValue = `#${columnName} #${firstCondition.operator} ${firstCondition.value}##`;

      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);

      return;
    }

    // Case 2: Partial join state (building second condition, before ENTER)
    const operator = searchMode.filterSearch.operator;
    const filterValue = searchMode.filterSearch.value;
    // Back to confirmed single-condition: #field #operator value##
    const newValue = `#${columnName} #${operator} ${filterValue}##`;

    onChange({
      target: { value: newValue },
    } as React.ChangeEvent<HTMLInputElement>);

    setTimeout(() => {
      inputRef?.current?.focus();
    }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
  }, [searchMode.filterSearch, onChange, inputRef, handleClearAll]);

  // Clear second operator - used by blue badge (second operator in multi-condition)
  const handleClearSecondOperator = useCallback(() => {
    if (!searchMode.filterSearch) {
      handleClearAll();
      return;
    }

    // Case 1: Confirmed multi-condition filter (after ENTER)
    if (
      searchMode.filterSearch.isMultiCondition &&
      searchMode.filterSearch.conditions &&
      searchMode.filterSearch.conditions.length === 2
    ) {
      const columnName = searchMode.filterSearch.field;
      const firstCondition = searchMode.filterSearch.conditions[0];
      const joinOp =
        searchMode.filterSearch.joinOperator?.toLowerCase() || 'and';

      // Back to state with join operator but no second operator: #field #op1 val1 #join #
      const newValue = `#${columnName} #${firstCondition.operator} ${firstCondition.value} #${joinOp} #`;

      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);

      return;
    }

    // Case 2: Partial join (building second condition, before ENTER)
    if (searchMode.partialJoin) {
      const columnName = searchMode.filterSearch.field;
      const operator = searchMode.filterSearch.operator;
      const filterValue = searchMode.filterSearch.value;
      const joinOp = searchMode.partialJoin.toLowerCase();
      // Back to partial join state: #field #operator value #join #
      const newValue = `#${columnName} #${operator} ${filterValue} #${joinOp} #`;

      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);

      return;
    }

    // Fallback
    handleClearAll();
  }, [
    searchMode.filterSearch,
    searchMode.partialJoin,
    onChange,
    inputRef,
    handleClearAll,
  ]);

  // Clear second value - used by gray badge (second value in multi-condition)
  const handleClearSecondValue = useCallback(() => {
    if (!searchMode.filterSearch) {
      handleClearValue();
      return;
    }

    // Case 1: Confirmed multi-condition filter (after ENTER)
    if (
      searchMode.filterSearch.isMultiCondition &&
      searchMode.filterSearch.conditions &&
      searchMode.filterSearch.conditions.length === 2
    ) {
      const columnName = searchMode.filterSearch.field;
      const firstCondition = searchMode.filterSearch.conditions[0];
      const joinOp =
        searchMode.filterSearch.joinOperator?.toLowerCase() || 'and';

      // Extract second operator from value pattern
      const secondOpMatch = value.match(/#(and|or)\s+#([^\s]+)/i);
      const secondOp = secondOpMatch
        ? secondOpMatch[2]
        : searchMode.filterSearch.conditions[1].operator;

      // Back to state with second operator but no value: #field #op1 val1 #join #op2
      const newValue = `#${columnName} #${firstCondition.operator} ${firstCondition.value} #${joinOp} #${secondOp} `;

      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);

      return;
    }

    // Case 2: Partial multi-condition (building second condition, before ENTER)
    if (searchMode.partialJoin || searchMode.secondOperator) {
      // Extract second operator from value pattern if not in searchMode
      const secondOpMatch = value.match(/#(and|or)\s+#([^\s]+)/i);

      if (secondOpMatch) {
        const [, joinOpFromValue, secondOpFromValue] = secondOpMatch;
        const columnName = searchMode.filterSearch.field;
        const operator = searchMode.filterSearch.operator;
        const filterValue = searchMode.filterSearch.value;
        const joinOp = (
          searchMode.partialJoin || joinOpFromValue
        ).toLowerCase();
        const secondOp = searchMode.secondOperator || secondOpFromValue;
        // Back to state with second operator but no value: #field #op1 val1 #join #op2
        const newValue = `#${columnName} #${operator} ${filterValue} #${joinOp} #${secondOp} `;

        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);

        setTimeout(() => {
          inputRef?.current?.focus();
        }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);

        return;
      }
    }

    // Fallback
    handleClearValue();
  }, [
    searchMode.filterSearch,
    searchMode.partialJoin,
    searchMode.secondOperator,
    value,
    onChange,
    inputRef,
    handleClearValue,
  ]);

  // ==================== EDIT HANDLERS ====================

  // Edit column - show column selector with partial search
  const handleEditColumn = useCallback(() => {
    if (!searchMode.filterSearch) {
      return;
    }

    const columnName = searchMode.filterSearch.column.headerName;
    // Set value to # + first few chars of column name to trigger selector with search
    const partialName = columnName.substring(0, 3);
    const newValue = `#${partialName}`;

    onChange({
      target: { value: newValue },
    } as React.ChangeEvent<HTMLInputElement>);

    setTimeout(() => {
      inputRef?.current?.focus();
    }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
  }, [searchMode.filterSearch, onChange, inputRef]);

  // Edit operator - show operator selector
  const handleEditOperator = useCallback(() => {
    if (!searchMode.filterSearch) {
      return;
    }

    const columnName = searchMode.filterSearch.field;
    // Set to #column # to trigger operator selector
    const newValue = `#${columnName} #`;

    onChange({
      target: { value: newValue },
    } as React.ChangeEvent<HTMLInputElement>);

    setTimeout(() => {
      inputRef?.current?.focus();
    }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
  }, [searchMode.filterSearch, onChange, inputRef]);

  // Edit join operator - show join operator selector
  const handleEditJoin = useCallback(() => {
    if (!searchMode.filterSearch) {
      return;
    }

    const columnName = searchMode.filterSearch.field;

    // For confirmed multi-condition: extract first condition
    if (
      searchMode.filterSearch.isMultiCondition &&
      searchMode.filterSearch.conditions &&
      searchMode.filterSearch.conditions.length >= 1
    ) {
      const firstCondition = searchMode.filterSearch.conditions[0];
      // Set to #col #op value # to trigger join selector
      const newValue = `#${columnName} #${firstCondition.operator} ${firstCondition.value} #`;

      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);

      return;
    }

    // For partial join state: already has value and operator
    const operator = searchMode.filterSearch.operator;
    const filterValue = searchMode.filterSearch.value;
    // Set to #col #op value # to trigger join selector
    const newValue = `#${columnName} #${operator} ${filterValue} #`;

    onChange({
      target: { value: newValue },
    } as React.ChangeEvent<HTMLInputElement>);

    setTimeout(() => {
      inputRef?.current?.focus();
    }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
  }, [searchMode.filterSearch, onChange, inputRef]);

  const { handleInputKeyDown } = useSearchKeyboard({
    value,
    searchMode,
    operatorSearchTerm,
    onChange,
    onKeyDown,
    onClearSearch,
    handleCloseColumnSelector,
    handleCloseOperatorSelector,
    handleCloseJoinOperatorSelector,
  });

  const searchTerm = useMemo(() => {
    if (value.startsWith('#')) {
      const match = value.match(/^#([^:]*)/);
      return match ? match[1] : '';
    }
    return '';
  }, [value]);

  const searchableColumns = useMemo(() => {
    return columns.filter(col => col.searchable);
  }, [columns]);

  const sortedColumns = useMemo(() => {
    if (!searchTerm) return searchableColumns;

    const searchTargets = searchableColumns.map(col => ({
      column: col,
      headerName: col.headerName,
      field: col.field,
      description: col.description || '',
    }));

    const headerResults = fuzzysort.go(searchTerm, searchTargets, {
      key: 'headerName',
      threshold: SEARCH_CONSTANTS.FUZZY_SEARCH_THRESHOLD,
    });

    const fieldResults = fuzzysort.go(searchTerm, searchTargets, {
      key: 'field',
      threshold: SEARCH_CONSTANTS.FUZZY_SEARCH_THRESHOLD,
    });

    const descResults = fuzzysort.go(searchTerm, searchTargets, {
      key: 'description',
      threshold: SEARCH_CONSTANTS.FUZZY_SEARCH_THRESHOLD,
    });

    const combinedResults = new Map();

    headerResults.forEach(result => {
      combinedResults.set(result.obj.column.field, {
        column: result.obj.column,
        score: result.score + 1000,
      });
    });

    fieldResults.forEach(result => {
      if (!combinedResults.has(result.obj.column.field)) {
        combinedResults.set(result.obj.column.field, {
          column: result.obj.column,
          score: result.score + 500,
        });
      }
    });

    descResults.forEach(result => {
      if (!combinedResults.has(result.obj.column.field)) {
        combinedResults.set(result.obj.column.field, {
          column: result.obj.column,
          score: result.score,
        });
      }
    });

    return Array.from(combinedResults.values())
      .sort((a, b) => b.score - a.score)
      .map(item => item.column);
  }, [searchableColumns, searchTerm]);

  const getPlaceholder = () => {
    if (showTargetedIndicator) {
      return 'Cari...';
    }
    return placeholder;
  };

  // Determine operators based on column type
  const operators = useMemo(() => {
    if (searchMode.selectedColumn?.type === 'number') {
      return [...NUMBER_FILTER_OPERATORS];
    }
    return [...DEFAULT_FILTER_OPERATORS];
  }, [searchMode.selectedColumn?.type]);

  // Calculate base padding (CSS variable will override when badges are present)
  const getBasePadding = () => {
    if (
      displayValue &&
      !displayValue.startsWith('#') &&
      !searchMode.showColumnSelector &&
      !showTargetedIndicator
    ) {
      return '12px';
    }
    return '40px';
  };

  return (
    <>
      <div ref={containerRef} className={`mb-2 relative ${className}`}>
        <div className="flex items-center">
          <SearchIcon
            searchMode={searchMode}
            searchState={searchState}
            displayValue={displayValue}
            showTargetedIndicator={showTargetedIndicator}
          />

          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              placeholder={getPlaceholder()}
              className={`text-sm outline-none tracking-normal w-full p-2.5 border transition-[border-color,box-shadow] duration-200 ease-in-out placeholder-gray-400 ${
                searchState === 'not-found'
                  ? 'border-danger focus:border-danger focus:ring-3 focus:ring-red-100'
                  : searchMode.isFilterMode &&
                      searchMode.filterSearch &&
                      searchMode.filterSearch.operator === 'contains' &&
                      !searchMode.filterSearch.isExplicitOperator
                    ? 'border-purple-300 ring-3 ring-purple-100 focus:border-purple-500 focus:ring-3 focus:ring-purple-100'
                    : searchMode.isFilterMode && searchMode.filterSearch
                      ? 'border-blue-300 ring-3 ring-blue-100 focus:border-blue-500 focus:ring-3 focus:ring-blue-100'
                      : searchMode.showColumnSelector
                        ? 'border-purple-300 ring-3 ring-purple-100 focus:border-purple-500 focus:ring-3 focus:ring-purple-100'
                        : 'border-gray-300 focus:border-primary focus:ring-3 focus:ring-emerald-200'
              } focus:outline-none rounded-lg`}
              style={{
                // Use CSS variable set by ResizeObserver (dynamic), fallback to base padding
                paddingLeft: showTargetedIndicator
                  ? 'var(--badge-width, 60px)'
                  : getBasePadding(),
              }}
              value={displayValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onFocus={onFocus}
              onBlur={onBlur}
            />

            {showTargetedIndicator && (
              <SearchBadge
                searchMode={searchMode}
                badgeRef={badgeRef}
                badgesContainerRef={badgesContainerRef}
                onClearColumn={handleClearAll}
                onClearOperator={handleClearToColumn}
                onClearValue={handleClearValue}
                onClearPartialJoin={handleClearPartialJoin}
                onClearSecondOperator={handleClearSecondOperator}
                onClearSecondValue={handleClearSecondValue}
                onClearAll={handleClearAll}
                onEditColumn={handleEditColumn}
                onEditOperator={handleEditOperator}
                onEditJoin={handleEditJoin}
                onHoverChange={handleHoverChange}
              />
            )}
          </div>
        </div>

        {resultsCount !== undefined && searchState === 'found' && (
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <LuSearch className="w-3 h-3" />
            <span>{resultsCount} hasil ditemukan</span>
          </div>
        )}
      </div>

      <ColumnSelector
        columns={sortedColumns}
        isOpen={searchMode.showColumnSelector}
        onSelect={handleColumnSelect}
        onClose={handleCloseColumnSelector}
        position={columnSelectorPosition}
        searchTerm={searchTerm}
      />

      <OperatorSelector
        operators={operators}
        isOpen={searchMode.showOperatorSelector}
        onSelect={handleOperatorSelect}
        onClose={handleCloseOperatorSelector}
        position={operatorSelectorPosition}
        searchTerm={operatorSearchTerm}
      />

      <JoinOperatorSelector
        operators={JOIN_OPERATORS}
        isOpen={searchMode.showJoinOperatorSelector}
        onSelect={handleJoinOperatorSelect}
        onClose={handleCloseJoinOperatorSelector}
        position={joinOperatorSelectorPosition}
      />
    </>
  );
};

export default EnhancedSearchBar;
