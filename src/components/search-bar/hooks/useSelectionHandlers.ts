/**
 * Hook for handling column and operator selection logic
 *
 * This hook extracts the complex selection handlers from EnhancedSearchBar
 * to reduce component size and improve maintainability.
 */

import { useCallback, type RefObject } from 'react';
import type {
  SearchColumn,
  EnhancedSearchState,
  FilterOperator,
} from '../types';
import type { JoinOperator } from '../operators';
import type { PreservedFilter } from '../utils/handlerHelpers';
import { PatternBuilder } from '../utils/PatternBuilder';
import {
  setFilterValue,
  extractMultiConditionPreservation,
} from '../utils/handlerHelpers';
import { isOperatorCompatibleWithColumn } from '../utils/operatorUtils';
import { SEARCH_CONSTANTS } from '../constants';

// ============================================================================
// Types
// ============================================================================

export type EditingBadgeType =
  | 'firstValue'
  | 'condition1Value'
  | 'firstValueTo'
  | 'condition1ValueTo';

export interface SelectionHandlersProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null> | undefined;
  searchMode: EnhancedSearchState;
  preservedSearchMode: EnhancedSearchState | null;
  setPreservedSearchMode: (mode: EnhancedSearchState | null) => void;
  preservedFilterRef: RefObject<PreservedFilter | null>;
  memoizedColumns: SearchColumn[];
  isEditingCondition1Operator: boolean;
  setIsEditingCondition1Operator: (editing: boolean) => void;
  setEditingBadge: (
    badge: { type: EditingBadgeType; value: string } | null
  ) => void;
}

export interface SelectionHandlersReturn {
  handleColumnSelect: (column: SearchColumn) => void;
  handleOperatorSelect: (operator: FilterOperator) => void;
  handleJoinOperatorSelect: (joinOp: JoinOperator) => void;
}

// ============================================================================
// Scalable Helper Functions (Index-Based)
// ============================================================================

/**
 * Get active condition index from searchMode.
 *
 * @returns Current condition index being built (0 = first, 1 = second, etc.)
 */
function getActiveConditionIndex(searchMode: EnhancedSearchState): number {
  return searchMode.activeConditionIndex ?? 0;
}

/**
 * Check if we're building a condition at index > 0.
 * Replaces hardcoded "isSecondOperator" / "isSecondColumn" checks.
 *
 * @returns true if activeConditionIndex > 0
 */
function isBuildingConditionN(searchMode: EnhancedSearchState): boolean {
  return getActiveConditionIndex(searchMode) > 0;
}

/**
 * Get column at specific condition index from scalable partialConditions.
 *
 * @param searchMode - The search state
 * @param index - Condition index (0 = first, 1 = second, etc.)
 */
function getColumnAt(
  searchMode: EnhancedSearchState,
  index: number
): SearchColumn | undefined {
  return searchMode.partialConditions?.[index]?.column;
}

// ============================================================================
// Column Selection Helper Functions
// ============================================================================

/**
 * CASE 0: Multi-column selection - selecting second column after join operator
 * Pattern: #col1 #op val #and # → selecting col2 → #col1 #op val #and #col2 #
 */
function handleColumnSelectMultiColumn(
  column: SearchColumn,
  searchMode: EnhancedSearchState,
  preservedFilterRef: RefObject<PreservedFilter | null>,
  preservedSearchMode: EnhancedSearchState | null,
  setPreservedSearchMode: (mode: EnhancedSearchState | null) => void,
  setIsEditingCondition1Operator: (editing: boolean) => void,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  inputRef: RefObject<HTMLInputElement | null> | undefined
): void {
  const filter = searchMode.filterSearch!;
  const firstCol = filter.field;
  const firstOp = filter.operator;
  const firstVal = filter.value;
  const firstValTo = filter.valueTo;
  const join = searchMode.partialJoin!.toUpperCase() as 'AND' | 'OR';

  let newValue: string;

  // Check if we have preserved second operator/value (from handleEditSecondColumn)
  if (
    preservedFilterRef.current?.condition1Operator &&
    preservedFilterRef.current.condition1Operator.trim() !== ''
  ) {
    const preserved = preservedFilterRef.current;
    const cond1Op = preserved.condition1Operator!;

    // Check if preserved operator is compatible with new column type
    const isSecondOpCompatible = isOperatorCompatibleWithColumn(
      column,
      cond1Op
    );

    if (isSecondOpCompatible) {
      // Operator is compatible - restore pattern with preserved operator
      if (
        preserved.condition1Value &&
        preserved.condition1Value.trim() !== ''
      ) {
        // Full multi-column with second value
        newValue = PatternBuilder.buildMultiColumnWithValueTo(
          firstCol,
          firstOp,
          firstVal,
          firstValTo,
          join,
          column.field,
          cond1Op,
          preserved.condition1Value,
          preserved.condition1ValueTo
        );
      } else {
        // Multi-column with operator but no second value
        if (firstValTo) {
          newValue = `#${firstCol} #${firstOp} ${firstVal} #to ${firstValTo} #${join.toLowerCase()} #${column.field} #${cond1Op} `;
        } else {
          newValue = PatternBuilder.multiColumnWithOperator(
            firstCol,
            firstOp,
            firstVal,
            join,
            column.field,
            cond1Op
          );
        }
      }

      // Clear preserved state after restoration
      preservedFilterRef.current = null;
      setPreservedSearchMode(null);
    } else {
      // Operator NOT compatible with new column type
      if (firstValTo) {
        newValue = `#${firstCol} #${firstOp} ${firstVal} #to ${firstValTo} #${join.toLowerCase()} #${column.field} #`;
      } else {
        newValue = PatternBuilder.multiColumnPartial(
          firstCol,
          firstOp,
          firstVal,
          join,
          column.field
        );
      }

      // Update preservedSearchMode with new second column
      if (preservedFilterRef.current) {
        preservedFilterRef.current = {
          ...preservedFilterRef.current,
          condition1Field: column.field,
        };
      }
      if (preservedSearchMode?.filterSearch?.conditions) {
        const updatedConditions =
          preservedSearchMode.filterSearch.conditions.map((cond, idx) =>
            idx === 1 ? { ...cond, field: column.field, column } : cond
          );
        setPreservedSearchMode({
          ...preservedSearchMode,
          filterSearch: {
            ...preservedSearchMode.filterSearch,
            conditions: updatedConditions,
          },
          showOperatorSelector: true,
        });
      }
      setIsEditingCondition1Operator(true);
    }
  } else {
    // No preserved second operator - open operator selector for new column
    if (firstValTo) {
      newValue = `#${firstCol} #${firstOp} ${firstVal} #to ${firstValTo} #${join.toLowerCase()} #${column.field} #`;
    } else {
      newValue = `#${firstCol} #${firstOp} ${firstVal} #${join.toLowerCase()} #${column.field} #`;
    }

    // Update preservedSearchMode with new second column
    if (preservedSearchMode?.filterSearch?.conditions) {
      const updatedConditions = preservedSearchMode.filterSearch.conditions.map(
        (cond, idx) =>
          idx === 1 ? { ...cond, field: column.field, column } : cond
      );
      setPreservedSearchMode({
        ...preservedSearchMode,
        filterSearch: {
          ...preservedSearchMode.filterSearch,
          conditions: updatedConditions,
        },
        showOperatorSelector: true,
      });
    }
    setIsEditingCondition1Operator(true);
  }

  setFilterValue(newValue, onChange, inputRef);

  setTimeout(() => {
    inputRef?.current?.focus();
  }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
}

/**
 * CASE 1: Column selection with preserved filter (from edit mode)
 */
function handleColumnSelectWithPreservedFilter(
  column: SearchColumn,
  preservedFilterRef: RefObject<PreservedFilter | null>,
  preservedSearchMode: EnhancedSearchState | null,
  setPreservedSearchMode: (mode: EnhancedSearchState | null) => void,
  memoizedColumns: SearchColumn[],
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  inputRef: RefObject<HTMLInputElement | null> | undefined
): void {
  const {
    operator,
    value,
    join,
    condition1Operator,
    condition1Value,
    condition1Field,
    wasMultiColumn,
  } = preservedFilterRef.current!;

  let newValue: string;

  // Check if operator is compatible with new column type
  const isOperatorCompatible = isOperatorCompatibleWithColumn(column, operator);

  if (isOperatorCompatible) {
    // Handle multi-condition or partial multi-condition
    if (join && condition1Operator) {
      const isMultiColumn = wasMultiColumn && !!condition1Field;

      if (isMultiColumn) {
        // MULTI-COLUMN FILTER
        const cond1Column = memoizedColumns.find(
          col => col.field === condition1Field
        );

        if (cond1Column) {
          const isSecondOperatorCompatible = isOperatorCompatibleWithColumn(
            cond1Column,
            condition1Operator
          );

          if (isSecondOperatorCompatible) {
            const valueTo = preservedFilterRef.current?.valueTo;
            const condition1ValueTo =
              preservedFilterRef.current?.condition1ValueTo;

            if (condition1Value && condition1Value.trim() !== '') {
              newValue = PatternBuilder.buildMultiColumnWithValueTo(
                column.field,
                operator,
                value,
                valueTo,
                join,
                condition1Field!,
                condition1Operator,
                condition1Value,
                condition1ValueTo
              );
            } else {
              newValue = PatternBuilder.multiColumnWithOperator(
                column.field,
                operator,
                value,
                join,
                condition1Field!,
                condition1Operator,
                valueTo
              );
            }
          } else {
            // Second operator not compatible
            const valueTo = preservedFilterRef.current?.valueTo;
            if (operator === 'inRange' && valueTo) {
              newValue = PatternBuilder.betweenConfirmed(
                column.field,
                value,
                valueTo
              );
            } else {
              newValue = PatternBuilder.confirmed(
                column.field,
                operator,
                value
              );
            }
          }
        } else {
          // Second column not found
          const valueTo = preservedFilterRef.current?.valueTo;
          if (operator === 'inRange' && valueTo) {
            newValue = PatternBuilder.betweenConfirmed(
              column.field,
              value,
              valueTo
            );
          } else {
            newValue = PatternBuilder.confirmed(column.field, operator, value);
          }
        }
      } else {
        // SAME-COLUMN FILTER
        const isSecondOperatorCompatible = isOperatorCompatibleWithColumn(
          column,
          condition1Operator
        );

        if (isSecondOperatorCompatible) {
          const valueTo = preservedFilterRef.current?.valueTo;
          const condition1ValueTo =
            preservedFilterRef.current?.condition1ValueTo;

          if (condition1Value && condition1Value.trim() !== '') {
            newValue = PatternBuilder.buildMultiConditionWithValueTo(
              column.field,
              operator,
              value,
              valueTo,
              join,
              condition1Operator,
              condition1Value,
              condition1ValueTo
            );
          } else {
            if (valueTo) {
              newValue = `#${column.field} #${operator} ${value} #to ${valueTo} #${join.toLowerCase()} #${condition1Operator} `;
            } else {
              newValue = PatternBuilder.partialMultiWithOperator(
                column.field,
                operator,
                value,
                join,
                condition1Operator
              );
            }
          }
        } else {
          // Second operator not compatible
          const valueTo = preservedFilterRef.current?.valueTo;
          if (operator === 'inRange' && valueTo) {
            newValue = PatternBuilder.betweenConfirmed(
              column.field,
              value,
              valueTo
            );
          } else {
            newValue = PatternBuilder.confirmed(column.field, operator, value);
          }
        }
      }
    } else if (join && condition1Field) {
      // Has join and second column but no second operator yet
      if (preservedFilterRef.current?.valueTo) {
        newValue = `#${column.field} #${operator} ${value} #to ${preservedFilterRef.current.valueTo} #${join.toLowerCase()} #${condition1Field} #`;
      } else {
        newValue = `#${column.field} #${operator} ${value} #${join.toLowerCase()} #${condition1Field} #`;
      }
    } else if (join) {
      // Has join but no second column yet
      if (preservedFilterRef.current?.valueTo) {
        newValue = `#${column.field} #${operator} ${value} #to ${preservedFilterRef.current.valueTo} #${join.toLowerCase()} #`;
      } else {
        newValue = `#${column.field} #${operator} ${value} #${join.toLowerCase()} #`;
      }
    } else {
      // Single-condition filter
      if (value && value.trim() !== '') {
        const valueTo = preservedFilterRef.current?.valueTo;
        if (operator === 'inRange' && valueTo) {
          newValue = PatternBuilder.betweenConfirmed(
            column.field,
            value,
            valueTo
          );
        } else {
          newValue = PatternBuilder.confirmed(column.field, operator, value);
        }
      } else {
        newValue = PatternBuilder.columnOperator(column.field, operator);
      }
    }

    // Clear preserved state
    preservedFilterRef.current = null;
    setPreservedSearchMode(null);
  } else {
    // Operator not compatible, auto-open operator selector
    newValue = PatternBuilder.columnWithOperatorSelector(column.field);

    // Don't clear preserved state if multi-condition
    if (
      preservedFilterRef.current?.join &&
      preservedFilterRef.current?.condition1Operator
    ) {
      preservedFilterRef.current = {
        ...preservedFilterRef.current,
        columnName: column.field,
        operator: '',
      };
      if (preservedSearchMode?.filterSearch) {
        const updatedConditions =
          preservedSearchMode.filterSearch.conditions?.map((cond, idx) =>
            idx === 0 ? { ...cond, field: column.field, column } : cond
          );
        setPreservedSearchMode({
          ...preservedSearchMode,
          filterSearch: {
            ...preservedSearchMode.filterSearch,
            field: column.field,
            column,
            conditions: updatedConditions,
          },
          showOperatorSelector: true,
        });
      }
    } else {
      preservedFilterRef.current = null;
      setPreservedSearchMode(null);
    }
  }

  setFilterValue(newValue, onChange, inputRef);

  setTimeout(() => {
    inputRef?.current?.focus();
  }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
}

// ============================================================================
// Operator Selection Helper Functions
// ============================================================================

/**
 * CASE 1: Editing second operator
 */
function handleOperatorSelectEditSecond(
  operator: FilterOperator,
  columnName: string,
  preservedFilterRef: RefObject<PreservedFilter | null>,
  preservedSearchMode: EnhancedSearchState | null,
  setPreservedSearchMode: (mode: EnhancedSearchState | null) => void,
  setIsEditingCondition1Operator: (editing: boolean) => void,
  setEditingBadge: (
    badge: { type: EditingBadgeType; value: string } | null
  ) => void,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  inputRef: RefObject<HTMLInputElement | null> | undefined
): void {
  const preserved = preservedFilterRef.current!;
  const joinOp = preserved.join as 'AND' | 'OR';
  const cond1Col = preserved.condition1Field;
  const isMultiColumn = preserved.wasMultiColumn && cond1Col;

  let newValue: string;

  // Special handling: changing to Between when no condition1ValueTo exists
  if (
    operator.value === 'inRange' &&
    preserved.condition1Value &&
    !preserved.condition1ValueTo
  ) {
    const firstPart =
      preserved.operator === 'inRange' && preserved.valueTo
        ? `#${columnName} #${preserved.operator} ${preserved.value} #to ${preserved.valueTo}`
        : `#${columnName} #${preserved.operator} ${preserved.value}`;

    if (isMultiColumn) {
      newValue = `${firstPart} #${joinOp.toLowerCase()} #${cond1Col} #${operator.value} ${preserved.condition1Value}##`;
    } else {
      newValue = `${firstPart} #${joinOp.toLowerCase()} #${operator.value} ${preserved.condition1Value}##`;
    }

    // Update preserved state
    preservedFilterRef.current = {
      ...preserved,
      condition1Operator: 'inRange',
    };

    if (preservedSearchMode?.filterSearch) {
      const updatedConditions =
        preservedSearchMode.filterSearch.conditions?.map((cond, idx) =>
          idx === 1 ? { ...cond, operator: 'inRange' } : cond
        );
      setPreservedSearchMode({
        ...preservedSearchMode,
        filterSearch: {
          ...preservedSearchMode.filterSearch,
          conditions: updatedConditions,
        },
      });
    }

    setIsEditingCondition1Operator(false);
    setFilterValue(newValue, onChange, inputRef);

    // Enter inline edit mode with dash appended
    setTimeout(() => {
      setEditingBadge({
        type: 'condition1Value',
        value: `${preserved.condition1Value}-`,
      });
    }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);

    return;
  }

  // Normal case with second value
  if (preserved.condition1Value) {
    const secondValTo =
      operator.value === 'inRange' ? preserved.condition1ValueTo : undefined;

    if (isMultiColumn) {
      newValue = PatternBuilder.buildMultiColumnWithValueTo(
        columnName,
        preserved.operator,
        preserved.value,
        preserved.valueTo,
        joinOp,
        cond1Col!,
        operator.value,
        preserved.condition1Value,
        secondValTo
      );
    } else {
      newValue = PatternBuilder.buildMultiConditionWithValueTo(
        columnName,
        preserved.operator,
        preserved.value,
        preserved.valueTo,
        joinOp,
        operator.value,
        preserved.condition1Value,
        secondValTo
      );
    }

    preservedFilterRef.current = null;
    setPreservedSearchMode(null);
  } else {
    // No second value yet - ready for input
    if (preserved.valueTo) {
      if (isMultiColumn) {
        newValue = `#${columnName} #${preserved.operator} ${preserved.value} #to ${preserved.valueTo} #${joinOp.toLowerCase()} #${cond1Col} #${operator.value} `;
      } else {
        newValue = `#${columnName} #${preserved.operator} ${preserved.value} #to ${preserved.valueTo} #${joinOp.toLowerCase()} #${operator.value} `;
      }
    } else {
      if (isMultiColumn) {
        newValue = PatternBuilder.multiColumnWithOperator(
          columnName,
          preserved.operator,
          preserved.value,
          joinOp,
          cond1Col!,
          operator.value
        );
      } else {
        newValue = PatternBuilder.partialMultiWithOperator(
          columnName,
          preserved.operator,
          preserved.value,
          joinOp,
          operator.value
        );
      }
    }
  }

  setIsEditingCondition1Operator(false);
  setFilterValue(newValue, onChange, inputRef);

  setTimeout(() => {
    inputRef?.current?.focus();
  }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
}

/**
 * CASE 2: Editing first operator with preserved filter
 */
function handleOperatorSelectEditFirst(
  operator: FilterOperator,
  columnName: string,
  preservedFilterRef: RefObject<PreservedFilter | null>,
  setPreservedSearchMode: (mode: EnhancedSearchState | null) => void,
  setEditingBadge: (
    badge: { type: EditingBadgeType; value: string } | null
  ) => void,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  inputRef: RefObject<HTMLInputElement | null> | undefined
): void {
  const preserved = preservedFilterRef.current!;
  let newValue: string;

  // Special handling: changing to Between when value exists but no valueTo
  if (operator.value === 'inRange' && preserved.value && !preserved.valueTo) {
    // Check if multi-condition
    if (preserved.join && preserved.condition1Operator) {
      const joinOp = preserved.join as 'AND' | 'OR';
      const cond1Col = preserved.condition1Field;
      const isMultiColumn = preserved.wasMultiColumn && cond1Col;

      if (isMultiColumn) {
        newValue = PatternBuilder.buildMultiColumnWithValueTo(
          columnName,
          operator.value,
          preserved.value,
          undefined,
          joinOp,
          cond1Col!,
          preserved.condition1Operator,
          preserved.condition1Value!,
          preserved.condition1ValueTo
        );
      } else {
        newValue = PatternBuilder.buildMultiConditionWithValueTo(
          columnName,
          operator.value,
          preserved.value,
          undefined,
          joinOp,
          preserved.condition1Operator,
          preserved.condition1Value!,
          preserved.condition1ValueTo
        );
      }
    } else {
      // Single condition
      newValue = `#${columnName} #${operator.value} ${preserved.value}##`;
    }

    setFilterValue(newValue, onChange, inputRef);

    // Enter inline edit for first value with dash
    setTimeout(() => {
      setEditingBadge({
        type: 'firstValue',
        value: `${preserved.value}-`,
      });
    }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);

    return;
  }

  // Normal case with multi-condition
  if (preserved.join && preserved.condition1Operator) {
    const joinOp = preserved.join as 'AND' | 'OR';
    const cond1Col = preserved.condition1Field;
    const isMultiColumn = preserved.wasMultiColumn && cond1Col;
    const valueTo =
      operator.value === 'inRange' ? preserved.valueTo : undefined;

    if (isMultiColumn) {
      newValue = PatternBuilder.buildMultiColumnWithValueTo(
        columnName,
        operator.value,
        preserved.value,
        valueTo,
        joinOp,
        cond1Col!,
        preserved.condition1Operator,
        preserved.condition1Value!,
        preserved.condition1ValueTo
      );
    } else {
      newValue = PatternBuilder.buildMultiConditionWithValueTo(
        columnName,
        operator.value,
        preserved.value,
        valueTo,
        joinOp,
        preserved.condition1Operator,
        preserved.condition1Value!,
        preserved.condition1ValueTo
      );
    }
  } else if (preserved.value && preserved.value.trim() !== '') {
    // Single condition with value
    const valueTo =
      operator.value === 'inRange' ? preserved.valueTo : undefined;
    if (valueTo) {
      newValue = PatternBuilder.betweenConfirmed(
        columnName,
        preserved.value,
        valueTo
      );
    } else {
      newValue = PatternBuilder.confirmed(
        columnName,
        operator.value,
        preserved.value
      );
    }
  } else {
    // No value yet
    newValue = PatternBuilder.columnOperator(columnName, operator.value);
  }

  preservedFilterRef.current = null;
  setPreservedSearchMode(null);
  setFilterValue(newValue, onChange, inputRef);

  setTimeout(() => {
    inputRef?.current?.focus();
  }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
}

/**
 * CASE 3: Selecting second operator in partial multi-condition
 */
function handleOperatorSelectSecond(
  operator: FilterOperator,
  searchMode: EnhancedSearchState,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  inputRef: RefObject<HTMLInputElement | null> | undefined
): void {
  const filter = searchMode.filterSearch!;
  const columnName = filter.field;
  const firstOp = filter.operator;
  const firstVal = filter.value;
  const firstValTo = filter.valueTo;
  const join = searchMode.partialJoin!.toUpperCase() as 'AND' | 'OR';

  let newValue: string;

  // Check for multi-column using scalable helper
  // getColumnAt(searchMode, 1) returns column at index 1 (second condition)
  const conditionColumn1 = getColumnAt(searchMode, 1);
  const conditionCol1Field = conditionColumn1?.field;
  const isMultiColumn =
    isBuildingConditionN(searchMode) && !!conditionCol1Field;

  if (firstValTo) {
    // First condition is Between
    if (isMultiColumn) {
      newValue = `#${columnName} #${firstOp} ${firstVal} #to ${firstValTo} #${join.toLowerCase()} #${conditionCol1Field} #${operator.value} `;
    } else {
      newValue = `#${columnName} #${firstOp} ${firstVal} #to ${firstValTo} #${join.toLowerCase()} #${operator.value} `;
    }
  } else {
    if (isMultiColumn) {
      newValue = PatternBuilder.multiColumnWithOperator(
        columnName,
        firstOp,
        firstVal,
        join,
        conditionCol1Field!,
        operator.value
      );
    } else {
      newValue = PatternBuilder.partialMultiWithOperator(
        columnName,
        firstOp,
        firstVal,
        join,
        operator.value
      );
    }
  }

  setFilterValue(newValue, onChange, inputRef);

  setTimeout(() => {
    inputRef?.current?.focus();
  }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
}

/**
 * CASE 4: Normal operator selection
 */
function handleOperatorSelectNormal(
  operator: FilterOperator,
  columnName: string,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  inputRef: RefObject<HTMLInputElement | null> | undefined
): void {
  const newValue = PatternBuilder.columnOperator(columnName, operator.value);
  setFilterValue(newValue, onChange, inputRef);

  setTimeout(() => {
    inputRef?.current?.focus();
  }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
}

// ============================================================================
// Main Hook
// ============================================================================

export function useSelectionHandlers(
  props: SelectionHandlersProps
): SelectionHandlersReturn {
  const {
    value,
    onChange,
    inputRef,
    searchMode,
    preservedSearchMode,
    setPreservedSearchMode,
    preservedFilterRef,
    memoizedColumns,
    isEditingCondition1Operator,
    setIsEditingCondition1Operator,
    setEditingBadge,
  } = props;

  // ============================================================================
  // Column Selection Handler
  // ============================================================================
  const handleColumnSelect = useCallback(
    (column: SearchColumn) => {
      // CASE 0: MULTI-COLUMN - selecting column for condition[N] after join operator
      // Use scalable check: activeConditionIndex > 0
      const isSelectingConditionNColumn =
        isBuildingConditionN(searchMode) &&
        searchMode.filterSearch &&
        searchMode.partialJoin;
      if (isSelectingConditionNColumn) {
        handleColumnSelectMultiColumn(
          column,
          searchMode,
          preservedFilterRef,
          preservedSearchMode,
          setPreservedSearchMode,
          setIsEditingCondition1Operator,
          onChange,
          inputRef
        );
        return;
      }

      // CASE 1: Preserved filter from edit column
      if (preservedFilterRef.current) {
        handleColumnSelectWithPreservedFilter(
          column,
          preservedFilterRef,
          preservedSearchMode,
          setPreservedSearchMode,
          memoizedColumns,
          onChange,
          inputRef
        );
        return;
      }

      // CASE 2: Normal column selection
      const newValue = PatternBuilder.columnWithOperatorSelector(column.field);
      setPreservedSearchMode(null);
      setFilterValue(newValue, onChange, inputRef);

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
    },
    [
      onChange,
      inputRef,
      searchMode,
      memoizedColumns,
      preservedSearchMode,
      setPreservedSearchMode,
      preservedFilterRef,
      setIsEditingCondition1Operator,
    ]
  );

  // ============================================================================
  // Operator Selection Handler
  // ============================================================================
  const handleOperatorSelect = useCallback(
    (operator: FilterOperator) => {
      const columnMatch = value.match(/^#([^:\s]+)/);
      if (!columnMatch) return;

      const columnName = columnMatch[1];

      // CASE 1: EDITING second operator
      if (
        isEditingCondition1Operator &&
        preservedFilterRef.current?.join &&
        (preservedFilterRef.current.join === 'AND' ||
          preservedFilterRef.current.join === 'OR')
      ) {
        handleOperatorSelectEditSecond(
          operator,
          columnName,
          preservedFilterRef,
          preservedSearchMode,
          setPreservedSearchMode,
          setIsEditingCondition1Operator,
          setEditingBadge,
          onChange,
          inputRef
        );
        return;
      }

      // CASE 2: EDITING first operator with preserved filter
      // Skip this case if we're selecting operator for condition[N] in multi-column filter
      // (preservedFilterRef might be set by handleJoinOperatorSelect, but we should use CASE 3)
      // Use scalable check: activeConditionIndex > 0
      if (preservedFilterRef.current && !isBuildingConditionN(searchMode)) {
        handleOperatorSelectEditFirst(
          operator,
          columnName,
          preservedFilterRef,
          setPreservedSearchMode,
          setEditingBadge,
          onChange,
          inputRef
        );
        return;
      }

      // CASE 3: Selecting operator for condition[N] in partial multi-condition
      // Note: Don't require isConfirmed - when building new multi-column filter,
      // the pattern is "#col1 #op1 val1 #and #col2 #" which has no ## marker
      // Use scalable check: activeConditionIndex > 0
      if (
        isBuildingConditionN(searchMode) &&
        searchMode.partialJoin &&
        searchMode.filterSearch?.value // First condition has value (is complete)
      ) {
        handleOperatorSelectSecond(operator, searchMode, onChange, inputRef);
        return;
      }

      // CASE 4: Normal operator selection
      handleOperatorSelectNormal(operator, columnName, onChange, inputRef);
    },
    [
      value,
      onChange,
      inputRef,
      searchMode,
      isEditingCondition1Operator,
      preservedFilterRef,
      preservedSearchMode,
      setPreservedSearchMode,
      setIsEditingCondition1Operator,
      setEditingBadge,
    ]
  );

  // ============================================================================
  // Join Operator Selection Handler
  // ============================================================================
  const handleJoinOperatorSelect = useCallback(
    (joinOp: JoinOperator) => {
      const preserved = preservedFilterRef.current;
      const joinOperator = joinOp.value.toUpperCase() as 'AND' | 'OR';

      let newValue: string;

      // CASE 1: Editing join with preserved filter
      if (preserved && preserved.condition1Operator && preserved.columnName) {
        const columnName = preserved.columnName;
        const cond1Col = preserved.condition1Field;
        const isMultiColumn = preserved.wasMultiColumn && cond1Col;

        if (
          preserved.condition1Value &&
          preserved.condition1Value.trim() !== ''
        ) {
          // Full multi-condition
          if (isMultiColumn) {
            newValue = PatternBuilder.buildMultiColumnWithValueTo(
              columnName,
              preserved.operator,
              preserved.value,
              preserved.valueTo,
              joinOperator,
              cond1Col!,
              preserved.condition1Operator,
              preserved.condition1Value,
              preserved.condition1ValueTo
            );
          } else {
            newValue = PatternBuilder.buildMultiConditionWithValueTo(
              columnName,
              preserved.operator,
              preserved.value,
              preserved.valueTo,
              joinOperator,
              preserved.condition1Operator,
              preserved.condition1Value,
              preserved.condition1ValueTo
            );
          }
        } else {
          // Partial multi-condition
          if (preserved.valueTo) {
            if (isMultiColumn) {
              newValue = `#${columnName} #${preserved.operator} ${preserved.value} #to ${preserved.valueTo} #${joinOperator.toLowerCase()} #${cond1Col} #${preserved.condition1Operator} `;
            } else {
              newValue = `#${columnName} #${preserved.operator} ${preserved.value} #to ${preserved.valueTo} #${joinOperator.toLowerCase()} #${preserved.condition1Operator} `;
            }
          } else {
            if (isMultiColumn) {
              newValue = PatternBuilder.multiColumnWithOperator(
                columnName,
                preserved.operator,
                preserved.value,
                joinOperator,
                cond1Col!,
                preserved.condition1Operator
              );
            } else {
              newValue = PatternBuilder.partialMultiWithOperator(
                columnName,
                preserved.operator,
                preserved.value,
                joinOperator,
                preserved.condition1Operator
              );
            }
          }
        }

        preservedFilterRef.current = null;
        setPreservedSearchMode(null);
      } else if (searchMode.filterSearch?.isConfirmed) {
        // CASE 2: Normal join selection after confirmed filter
        const filter = searchMode.filterSearch;

        // Extract multi-condition preservation
        const extraction = extractMultiConditionPreservation(searchMode);
        preservedFilterRef.current = extraction;

        if (filter.valueTo) {
          newValue = `#${filter.field} #${filter.operator} ${filter.value} #to ${filter.valueTo} #${joinOperator.toLowerCase()} #`;
        } else {
          newValue = PatternBuilder.partialMulti(
            filter.field,
            filter.operator,
            filter.value,
            joinOperator
          );
        }
      } else {
        // Fallback
        return;
      }

      setFilterValue(newValue, onChange, inputRef);

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
    },
    [onChange, inputRef, searchMode, preservedFilterRef, setPreservedSearchMode]
  );

  return {
    handleColumnSelect,
    handleOperatorSelect,
    handleJoinOperatorSelect,
  };
}
