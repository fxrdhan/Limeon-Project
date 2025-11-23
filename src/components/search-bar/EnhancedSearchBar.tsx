import React, { useRef, useCallback, useMemo, useState } from 'react';
import { LuSearch } from 'react-icons/lu';
import fuzzysort from 'fuzzysort';
import {
  EnhancedSearchBarProps,
  SearchColumn,
  FilterOperator,
  EnhancedSearchState,
} from './types';
import { SEARCH_CONSTANTS } from './constants';
import { JOIN_OPERATORS, JoinOperator } from './operators';
import { buildColumnValue, findColumn } from './utils/searchUtils';
import {
  getOperatorsForColumn,
  isOperatorCompatibleWithColumn,
} from './utils/operatorUtils';
import { PatternBuilder } from './utils/PatternBuilder';
import {
  setFilterValue,
  extractMultiConditionPreservation,
  getFirstCondition,
  getJoinOperator,
  getSecondOperatorValue,
} from './utils/handlerHelpers';
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

  // Ref to store preserved filter when editing column/operator
  const preservedFilterRef = useRef<{
    columnName?: string;
    operator: string;
    value: string;
    valueTo?: string; // For Between (inRange) operator
    // For multi-condition filters (AND/OR)
    join?: 'AND' | 'OR';
    secondOperator?: string;
    secondValue?: string;
    secondValueTo?: string; // For Between (inRange) operator in second condition
  } | null>(null);

  // State to preserve searchMode during edit (to keep badges visible)
  const [preservedSearchMode, setPreservedSearchMode] =
    useState<EnhancedSearchState | null>(null);

  // Track whether we're editing the second operator (after AND/OR join)
  const [isEditingSecondOperator, setIsEditingSecondOperator] = useState(false);

  // State to track current join operator value during edit mode
  const [currentJoinOperator, setCurrentJoinOperator] = useState<
    'AND' | 'OR' | undefined
  >(undefined);

  const { searchMode } = useSearchState({
    value,
    columns: memoizedColumns,
    onGlobalSearch,
    onFilterSearch,
    isEditMode: preservedSearchMode !== null, // In edit mode when preserving badges
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

  // Clear preserved state - used to reset edit mode and badge visibility
  const handleClearPreservedState = useCallback(() => {
    setPreservedSearchMode(null);
    preservedFilterRef.current = null;
    setCurrentJoinOperator(undefined);
    setIsEditingSecondOperator(false);
  }, []);

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
      let newValue: string;

      // Check if we have preserved filter from edit column
      if (preservedFilterRef.current) {
        const { operator, value, join, secondOperator, secondValue } =
          preservedFilterRef.current;

        // Check if operator is compatible with new column type
        const isOperatorCompatible = isOperatorCompatibleWithColumn(
          column,
          operator
        );

        if (isOperatorCompatible) {
          // Check if it's a multi-condition filter (or partial multi-condition)
          if (join && secondOperator) {
            // Check if second operator is also compatible
            const isSecondOperatorCompatible = isOperatorCompatibleWithColumn(
              column,
              secondOperator
            );

            if (isSecondOperatorCompatible) {
              // Restore multi-condition filter with the new column
              if (secondValue && secondValue.trim() !== '') {
                // Full multi-condition with second value
                newValue = PatternBuilder.multiCondition(
                  column.field,
                  operator,
                  value,
                  join,
                  secondOperator,
                  secondValue
                );
              } else {
                // Partial multi-condition (no second value yet)
                newValue = PatternBuilder.partialMultiWithOperator(
                  column.field,
                  operator,
                  value,
                  join,
                  secondOperator
                );
              }
            } else {
              // Second operator not compatible, restore only first condition
              newValue = PatternBuilder.confirmed(
                column.field,
                operator,
                value
              );
            }
          } else {
            // Single-condition filter - restore operator (and value if it exists)
            if (value && value.trim() !== '') {
              // Has value: restore fully confirmed filter
              newValue = PatternBuilder.confirmed(
                column.field,
                operator,
                value
              );
            } else {
              // No value yet (Case 1: 2 badges - column + operator)
              newValue = PatternBuilder.columnOperator(column.field, operator);
            }
          }
        } else {
          // Operator not compatible, auto-open operator selector for new column
          newValue = PatternBuilder.columnWithOperatorSelector(column.field);
        }

        // Clear preserved filter and searchMode
        preservedFilterRef.current = null;
        setPreservedSearchMode(null);
      } else {
        // Normal column selection without preserved filter
        // Auto-open operator selector by ending with " #"
        newValue = PatternBuilder.columnWithOperatorSelector(column.field);
        // Clear preserved searchMode if any
        setPreservedSearchMode(null);
      }

      setFilterValue(newValue, onChange, inputRef);
    },
    [onChange, inputRef]
  );

  const handleOperatorSelect = useCallback(
    (operator: FilterOperator) => {
      const columnMatch = value.match(/^#([^:\s]+)/);
      if (!columnMatch) return;

      const columnName = columnMatch[1];
      let newValue: string;

      // CASE 1: EDITING second operator (badge already exists or partial)
      if (
        isEditingSecondOperator &&
        preservedFilterRef.current?.join &&
        (preservedFilterRef.current.join === 'AND' ||
          preservedFilterRef.current.join === 'OR')
      ) {
        const preserved = preservedFilterRef.current;
        const joinOp = preserved.join as 'AND' | 'OR'; // Type assertion (safe due to guard above)
        if (preserved.secondValue) {
          // Full multi-condition with second value
          newValue = PatternBuilder.multiCondition(
            columnName,
            preserved.operator,
            preserved.value,
            joinOp,
            operator.value,
            preserved.secondValue
          );
        } else {
          // Partial multi-condition (no second value yet)
          newValue = PatternBuilder.partialMultiWithOperator(
            columnName,
            preserved.operator,
            preserved.value,
            joinOp,
            operator.value
          );
        }
        // Clear preserved filter and searchMode
        preservedFilterRef.current = null;
        setPreservedSearchMode(null);
        setIsEditingSecondOperator(false);
      }
      // CASE 2: EDITING first operator (badge already exists)
      else if (!isEditingSecondOperator && preservedFilterRef.current?.value) {
        const preserved = preservedFilterRef.current;
        const preservedValue = preserved.value;

        // Check if this is a multi-condition filter
        if (
          preserved.join &&
          preserved.secondOperator &&
          preserved.secondValue
        ) {
          // Restore full multi-condition with new first operator
          newValue = PatternBuilder.multiCondition(
            columnName,
            operator.value,
            preservedValue,
            preserved.join,
            preserved.secondOperator,
            preserved.secondValue
          );
        } else {
          // Single condition: just restore first value with new operator
          newValue = PatternBuilder.confirmed(
            columnName,
            operator.value,
            preservedValue
          );
        }
        // Clear preserved filter and searchMode
        preservedFilterRef.current = null;
        setPreservedSearchMode(null);
      }
      // CASE 3: SELECTING second operator (creating new multi-condition filter)
      else if (searchMode.isSecondOperator) {
        // Append operator to existing value
        // Current: #name #contains paracetamol #and #
        // Result: #name #contains paracetamol #and #contains
        newValue = value.replace(/\s*#\s*$/, '') + ` #${operator.value} `;
        // Clear preserved searchMode if any
        setPreservedSearchMode(null);
      }
      // CASE 4: SELECTING first operator (creating new filter)
      else {
        newValue = PatternBuilder.columnOperator(columnName, operator.value);
        // Clear preserved searchMode if any
        setPreservedSearchMode(null);
      }

      setFilterValue(newValue, onChange, inputRef);
    },
    [
      value,
      onChange,
      inputRef,
      searchMode.isSecondOperator,
      isEditingSecondOperator,
    ]
  );

  const handleJoinOperatorSelect = useCallback(
    (joinOp: JoinOperator) => {
      // Get preserved filter data
      const preserved = preservedFilterRef.current;

      // Convert join operator to uppercase for PatternBuilder methods
      const joinOperator = joinOp.value.toUpperCase() as 'AND' | 'OR';

      // Get column name from searchMode
      const columnName = searchMode.filterSearch?.field;
      if (!columnName) {
        // Fallback: use string manipulation if no column data
        const cleanValue = value.replace(/\s*#\s*$/, '').trim();
        const newValue = `${cleanValue} #${joinOp.value} #`;
        onChange({
          target: { value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
        return;
      }

      let newValue: string;

      if (preserved) {
        // Use preserved data to rebuild pattern correctly (handles Between operator)
        if (preserved.secondOperator) {
          // Determine if first condition is Between
          const isFirstBetween =
            preserved.operator === 'inRange' && preserved.valueTo;
          // Determine if second condition is Between
          const isSecondBetween =
            preserved.secondOperator === 'inRange' && preserved.secondValueTo;

          if (preserved.secondValue) {
            // COMPLETE multi-condition: both conditions have values
            if (isFirstBetween && isSecondBetween) {
              // Between AND/OR Between
              newValue = PatternBuilder.betweenAndBetween(
                columnName,
                preserved.value,
                preserved.valueTo!,
                joinOperator,
                preserved.secondValue,
                preserved.secondValueTo!
              );
            } else if (isFirstBetween && !isSecondBetween) {
              // Between AND/OR Normal
              newValue = PatternBuilder.betweenAndNormal(
                columnName,
                preserved.value,
                preserved.valueTo!,
                joinOperator,
                preserved.secondOperator,
                preserved.secondValue
              );
            } else if (!isFirstBetween && isSecondBetween) {
              // Normal AND/OR Between
              newValue = PatternBuilder.normalAndBetween(
                columnName,
                preserved.operator,
                preserved.value,
                joinOperator,
                preserved.secondValue,
                preserved.secondValueTo!
              );
            } else {
              // Normal AND/OR Normal
              newValue = PatternBuilder.multiCondition(
                columnName,
                preserved.operator,
                preserved.value,
                joinOperator,
                preserved.secondOperator,
                preserved.secondValue
              );
            }
          } else {
            // PARTIAL multi-condition: second condition has no value yet
            if (isFirstBetween) {
              // Between with join and second operator selected
              newValue = `#${columnName} #${preserved.operator} ${preserved.value} ${preserved.valueTo} #${joinOp.value} #${preserved.secondOperator} `;
            } else {
              // Normal operator with join and second operator selected
              newValue = PatternBuilder.partialMultiWithOperator(
                columnName,
                preserved.operator,
                preserved.value,
                joinOperator,
                preserved.secondOperator
              );
            }
          }
        } else {
          // NO second condition yet - just first condition + join selector
          // Pattern: #field #operator value(s) #join #
          if (preserved.operator === 'inRange' && preserved.valueTo) {
            // Between with join selector open
            newValue = `#${columnName} #${preserved.operator} ${preserved.value} ${preserved.valueTo} #${joinOp.value} #`;
          } else {
            // Normal operator with join selector open
            newValue = `#${columnName} #${preserved.operator} ${preserved.value} #${joinOp.value} #`;
          }
        }
      } else {
        // No preserved data - fallback to string manipulation
        const cleanValue = value.replace(/\s*#\s*$/, '').trim();
        newValue = `${cleanValue} #${joinOp.value} #`;
      }

      onChange({
        target: { value: newValue },
      } as React.ChangeEvent<HTMLInputElement>);

      // Clear preserved state after rebuilding
      preservedFilterRef.current = null;
      setPreservedSearchMode(null);
      setCurrentJoinOperator(undefined);

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
    },
    [value, searchMode, onChange, inputRef]
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
      // Auto-open operator selector after clearing operator
      const newValue = PatternBuilder.columnWithOperatorSelector(columnName);
      setFilterValue(newValue, onChange, inputRef);
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
      const newValue = PatternBuilder.columnOperator(columnName, operator);
      setFilterValue(newValue, onChange, inputRef);
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
    const firstCondition = getFirstCondition(searchMode.filterSearch);

    // Back to confirmed single-condition: #field #operator value##
    const newValue = PatternBuilder.confirmed(
      columnName,
      firstCondition.operator,
      firstCondition.value
    );

    setFilterValue(newValue, onChange, inputRef);
  }, [searchMode.filterSearch, onChange, inputRef, handleClearAll]);

  // Clear second operator - used by blue badge (second operator in multi-condition)
  const handleClearSecondOperator = useCallback(() => {
    if (!searchMode.filterSearch) {
      handleClearAll();
      return;
    }

    // Clear preserved state to ensure badge disappears and no operator is pre-highlighted
    handleClearPreservedState();

    const columnName = searchMode.filterSearch.field;
    const firstCondition = getFirstCondition(searchMode.filterSearch);
    const joinOp = getJoinOperator(searchMode.filterSearch, searchMode);

    if (joinOp && (joinOp === 'AND' || joinOp === 'OR')) {
      // Back to state with join operator but no second operator: #field #op1 val1 #join #
      const newValue = PatternBuilder.partialMulti(
        columnName,
        firstCondition.operator,
        firstCondition.value,
        joinOp
      );

      setFilterValue(newValue, onChange, inputRef);
    } else {
      // Fallback if no join operator found
      handleClearAll();
    }
  }, [
    searchMode,
    onChange,
    inputRef,
    handleClearAll,
    handleClearPreservedState,
  ]);

  // Clear second value - used by gray badge (second value in multi-condition)
  const handleClearSecondValue = useCallback(() => {
    if (!searchMode.filterSearch) {
      handleClearValue();
      return;
    }

    const columnName = searchMode.filterSearch.field;
    const firstCondition = getFirstCondition(searchMode.filterSearch);
    const joinOp = getJoinOperator(searchMode.filterSearch, searchMode);
    const secondOp = getSecondOperatorValue(
      searchMode.filterSearch,
      searchMode,
      value
    );

    if (joinOp && (joinOp === 'AND' || joinOp === 'OR') && secondOp) {
      // Back to state with second operator but no value: #field #op1 val1 #join #op2
      const newValue = PatternBuilder.partialMultiWithOperator(
        columnName,
        firstCondition.operator,
        firstCondition.value,
        joinOp,
        secondOp
      );

      setFilterValue(newValue, onChange, inputRef);
    } else {
      // Fallback if missing data
      handleClearValue();
    }
  }, [searchMode, value, onChange, inputRef, handleClearValue]);

  // ==================== EDIT HANDLERS ====================

  // Edit column - show column selector with all columns
  // Preserve operator and value to restore after column selection
  const handleEditColumn = useCallback(() => {
    if (!searchMode.filterSearch) {
      return;
    }

    // Save current searchMode to keep badges visible during edit
    setPreservedSearchMode(searchMode);

    // Extract and preserve filter data
    preservedFilterRef.current = extractMultiConditionPreservation(searchMode);

    // Set to just # to show all columns in selector
    const newValue = PatternBuilder.column('');

    setFilterValue(newValue, onChange, inputRef);
  }, [searchMode, onChange, inputRef]);

  // Edit operator - show operator selector
  const handleEditOperator = useCallback(
    (isSecond: boolean = false) => {
      if (!searchMode.filterSearch) {
        return;
      }

      const columnName = searchMode.filterSearch.field;

      // Save current searchMode to keep value badge visible during edit
      setPreservedSearchMode(searchMode);

      // Track if we're editing the second operator
      setIsEditingSecondOperator(isSecond);

      // Extract and preserve filter data
      preservedFilterRef.current =
        extractMultiConditionPreservation(searchMode);

      // Build pattern for operator selector
      let newValue: string;

      if (
        isSecond &&
        preservedFilterRef.current?.operator &&
        preservedFilterRef.current?.value &&
        preservedFilterRef.current?.join
      ) {
        // For second operator edit, preserve first condition: #column #operator1 value1 #join #
        newValue = PatternBuilder.partialMulti(
          columnName,
          preservedFilterRef.current.operator,
          preservedFilterRef.current.value,
          preservedFilterRef.current.join
        );
      } else {
        // For first operator edit, just: #column #
        newValue = PatternBuilder.columnWithOperatorSelector(columnName);
      }

      setFilterValue(newValue, onChange, inputRef);
    },
    [searchMode, onChange, inputRef]
  );

  // Edit join operator - show join operator selector
  const handleEditJoin = useCallback(() => {
    if (!searchMode.filterSearch) {
      return;
    }

    const columnName = searchMode.filterSearch.field;
    const firstCondition = getFirstCondition(searchMode.filterSearch);
    const joinOp = getJoinOperator(searchMode.filterSearch, searchMode);

    // Save current searchMode to keep all badges visible during edit
    setPreservedSearchMode(searchMode);

    // Extract and preserve filter data
    preservedFilterRef.current = extractMultiConditionPreservation(searchMode);

    // Set current join operator state for selector highlighting
    if (joinOp && (joinOp === 'AND' || joinOp === 'OR')) {
      setCurrentJoinOperator(joinOp);
    }

    // Set to #col #op value # to trigger join selector
    const newValue = PatternBuilder.withJoinSelector(
      columnName,
      firstCondition.operator,
      firstCondition.value,
      firstCondition.valueTo // Pass valueTo for Between operators
    );

    setFilterValue(newValue, onChange, inputRef);
  }, [searchMode, onChange, inputRef]);

  // Edit value - show input with current value pre-filled for editing
  const handleEditValue = useCallback(() => {
    if (!searchMode.filterSearch) {
      return;
    }

    const columnName = searchMode.filterSearch.field;
    const operator = searchMode.filterSearch.operator;
    const currentValue = searchMode.filterSearch.value;

    // Save current searchMode to keep column, operator badges visible during edit
    setPreservedSearchMode(searchMode);

    // Extract and preserve multi-condition data if needed
    preservedFilterRef.current = extractMultiConditionPreservation(searchMode);

    // Show only first value for editing (with or without multi-condition)
    const newValue = PatternBuilder.editFirstValue(
      columnName,
      operator,
      currentValue
    );

    setFilterValue(newValue, onChange, inputRef, { cursorAtEnd: true });
  }, [searchMode, onChange, inputRef]);

  // Edit second value in multi-condition filter
  const handleEditSecondValue = useCallback(() => {
    if (
      !searchMode.filterSearch ||
      !searchMode.filterSearch.isMultiCondition ||
      !searchMode.filterSearch.conditions ||
      searchMode.filterSearch.conditions.length < 2
    ) {
      return;
    }

    const columnName = searchMode.filterSearch.field;
    const firstCondition = searchMode.filterSearch.conditions[0];
    const secondCondition = searchMode.filterSearch.conditions[1];
    const joinOp = searchMode.filterSearch.joinOperator || 'AND';

    // Create modified searchMode with second value hidden (empty string)
    // This will hide the 2nd value badge during edit
    const modifiedSearchMode: EnhancedSearchState = {
      ...searchMode,
      filterSearch: {
        ...searchMode.filterSearch,
        conditions: [
          firstCondition,
          {
            ...secondCondition,
            value: '', // Empty value will hide the badge
          },
        ],
      },
    };

    setPreservedSearchMode(modifiedSearchMode);

    // Preserve first condition while editing second value
    preservedFilterRef.current = {
      columnName, // Store column name for reconstruction
      operator: firstCondition.operator,
      value: firstCondition.value,
      join: joinOp,
      secondOperator: secondCondition.operator,
      secondValue: secondCondition.value,
    };

    // Show input with second value pre-filled for editing
    const newValue = PatternBuilder.editSecondValue(
      columnName,
      firstCondition.operator,
      firstCondition.value,
      joinOp,
      secondCondition.operator,
      secondCondition.value
    );

    setFilterValue(newValue, onChange, inputRef, { cursorAtEnd: true });
  }, [searchMode, onChange, inputRef]);

  // Wrap onChange to reconstruct multi-condition pattern when confirming first value edit
  const handleOnChangeWithReconstruction = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      // CASE 5: User types on confirmed multi-condition filter - enter edit mode for second value
      // Pattern: #field #op1 val1 #join #op2 val2## → user types → #field #op1 val1 #join #op2 newValue
      if (
        searchMode.isFilterMode &&
        searchMode.filterSearch?.isConfirmed &&
        searchMode.filterSearch?.isMultiCondition &&
        searchMode.filterSearch?.conditions &&
        searchMode.filterSearch.conditions.length >= 2 &&
        inputValue.trim() !== '' &&
        inputValue.trim() !== '#' &&
        !preservedFilterRef.current // Not already in edit mode
      ) {
        const columnName = searchMode.filterSearch.field;
        const firstCondition = searchMode.filterSearch.conditions[0];
        const secondCondition = searchMode.filterSearch.conditions[1];
        const joinOp = searchMode.filterSearch.joinOperator || 'AND';

        // Create modified searchMode with second value hidden (empty string)
        // This will hide the 2nd value badge during edit
        const modifiedSearchMode: EnhancedSearchState = {
          ...searchMode,
          filterSearch: {
            ...searchMode.filterSearch,
            conditions: [
              firstCondition,
              {
                ...secondCondition,
                value: '', // Empty value will hide the badge
              },
            ],
          },
        };

        setPreservedSearchMode(modifiedSearchMode);

        // Preserve first condition while editing second value
        preservedFilterRef.current = {
          columnName,
          operator: firstCondition.operator,
          value: firstCondition.value,
          join: joinOp,
          secondOperator: secondCondition.operator,
          secondValue: secondCondition.value,
        };

        // Build pattern for editing second value
        // Remove ## marker and replace second value with new input
        const newValue = `#${columnName} #${firstCondition.operator} ${firstCondition.value} #${joinOp.toLowerCase()} #${secondCondition.operator} ${inputValue}`;

        onChange({
          ...e,
          target: { ...e.target, value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);
        return;
      }

      // Detect when input becomes empty while editing second value in partial multi-condition
      // Pattern: #field #op1 val1 #join #op2 val2 (val2 being edited in input)
      // When input is emptied → should become: #field #op1 val1 #join #
      if (
        inputValue.trim() === '' &&
        preservedFilterRef.current?.columnName &&
        preservedFilterRef.current?.join &&
        preservedFilterRef.current?.secondOperator &&
        preservedFilterRef.current?.value &&
        preservedFilterRef.current?.value.trim() !== ''
      ) {
        // Input is now empty while in partial multi-condition with second operator
        // Remove second operator and add trailing # to open operator selector
        const columnName = preservedFilterRef.current.columnName;
        const operator = preservedFilterRef.current.operator;
        const firstValue = preservedFilterRef.current.value;
        const joinOp = preservedFilterRef.current.join.toLowerCase();

        // Create pattern without second operator but with trailing # for operator selector
        const newValue = `#${columnName} #${operator} ${firstValue} #${joinOp} #`;

        onChange({
          ...e,
          target: { ...e.target, value: newValue },
        } as React.ChangeEvent<HTMLInputElement>);

        // Clear preserved filter after cleanup
        preservedFilterRef.current = null;
        setPreservedSearchMode(null);
        return;
      }

      // Detect confirmation of value edit (## marker added)
      if (
        inputValue.endsWith('##') &&
        preservedFilterRef.current?.secondOperator &&
        preservedFilterRef.current?.secondValue
      ) {
        // Remove ## marker
        const baseValue = inputValue.slice(0, -2);

        // Check if baseValue already contains the join operator
        // If yes → editing second value (full pattern present)
        // If no  → editing first value (only first condition present)
        const joinPattern = `#${preservedFilterRef.current.join?.toLowerCase()}`;
        const hasJoinInBase = baseValue.includes(joinPattern);

        if (hasJoinInBase) {
          // Editing second value - baseValue already contains the full pattern
          // Don't reconstruct, just pass through
          onChange(e);
        } else {
          // Editing first value - reconstruct full multi-condition pattern
          const fullPattern = `${baseValue} ${joinPattern} #${preservedFilterRef.current.secondOperator} ${preservedFilterRef.current.secondValue}##`;

          // Call parent onChange with reconstructed pattern
          onChange({
            ...e,
            target: { ...e.target, value: fullPattern },
          } as React.ChangeEvent<HTMLInputElement>);
        }
      } else {
        // Normal onChange - pass through
        onChange(e);
      }
    },
    [onChange, searchMode, setPreservedSearchMode]
  );

  const { handleInputKeyDown } = useSearchKeyboard({
    value,
    searchMode,
    operatorSearchTerm,
    onChange: handleOnChangeWithReconstruction, // Use wrapped onChange
    onKeyDown,
    onClearSearch,
    handleCloseColumnSelector,
    handleCloseOperatorSelector,
    handleCloseJoinOperatorSelector,
    onClearPreservedState: handleClearPreservedState,
    onEditSecondValue: handleEditSecondValue,
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
    if (searchMode.selectedColumn) {
      return getOperatorsForColumn(searchMode.selectedColumn);
    }
    return [];
  }, [searchMode.selectedColumn]);

  // Calculate default selected operator index when in edit mode
  const defaultOperatorIndex = useMemo(() => {
    // If editing second operator in confirmed multi-condition, get from conditions array
    if (
      isEditingSecondOperator &&
      preservedSearchMode?.filterSearch?.isMultiCondition &&
      preservedSearchMode?.filterSearch?.conditions &&
      preservedSearchMode.filterSearch.conditions.length >= 2
    ) {
      const currentOperator =
        preservedSearchMode.filterSearch.conditions[1].operator;
      const index = operators.findIndex(op => op.value === currentOperator);
      return index >= 0 ? index : undefined;
    }
    // If editing second operator in partial multi-condition, use secondOperator
    else if (isEditingSecondOperator && preservedSearchMode?.secondOperator) {
      const currentOperator = preservedSearchMode.secondOperator;
      const index = operators.findIndex(op => op.value === currentOperator);
      return index >= 0 ? index : undefined;
    }
    // Otherwise use first operator from filterSearch
    else if (preservedSearchMode?.filterSearch?.operator) {
      const currentOperator = preservedSearchMode.filterSearch.operator;
      const index = operators.findIndex(op => op.value === currentOperator);
      return index >= 0 ? index : undefined;
    }
    return undefined;
  }, [preservedSearchMode, isEditingSecondOperator, operators]);

  // Calculate default selected column index when in edit mode
  const defaultColumnIndex = useMemo(() => {
    if (preservedSearchMode?.filterSearch?.field) {
      const currentColumnField = preservedSearchMode.filterSearch.field;
      const index = sortedColumns.findIndex(
        col => col.field === currentColumnField
      );
      return index >= 0 ? index : undefined;
    }
    return undefined;
  }, [preservedSearchMode, sortedColumns]);

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

            {(showTargetedIndicator || preservedSearchMode) && (
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
                onEditValue={handleEditValue}
                onEditSecondValue={handleEditSecondValue}
                onHoverChange={handleHoverChange}
                preservedSearchMode={preservedSearchMode}
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
        defaultSelectedIndex={defaultColumnIndex}
      />

      <OperatorSelector
        operators={operators}
        isOpen={searchMode.showOperatorSelector}
        onSelect={handleOperatorSelect}
        onClose={handleCloseOperatorSelector}
        position={operatorSelectorPosition}
        searchTerm={operatorSearchTerm}
        defaultSelectedIndex={defaultOperatorIndex}
      />

      <JoinOperatorSelector
        operators={JOIN_OPERATORS}
        isOpen={searchMode.showJoinOperatorSelector}
        onSelect={handleJoinOperatorSelect}
        onClose={handleCloseJoinOperatorSelector}
        position={joinOperatorSelectorPosition}
        currentValue={
          currentJoinOperator ||
          searchMode.partialJoin ||
          searchMode.filterSearch?.joinOperator
        }
      />
    </>
  );
};

export default EnhancedSearchBar;
