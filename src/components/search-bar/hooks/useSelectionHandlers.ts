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

/**
 * @deprecated Use the new index-based structure instead:
 * { conditionIndex: number; field: 'value' | 'valueTo'; value: string }
 */
export type EditingBadgeType =
  | 'firstValue'
  | 'secondValue'
  | 'firstValueTo'
  | 'secondValueTo';

/**
 * New scalable structure for inline editing badges
 */
export interface EditingBadgeState {
  conditionIndex: number; // 0 = first condition, 1 = second, etc.
  field: 'value' | 'valueTo'; // Which field is being edited
  value: string;
}

export interface SelectionHandlersProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: RefObject<HTMLInputElement | null> | undefined;
  searchMode: EnhancedSearchState;
  preservedSearchMode: EnhancedSearchState | null;
  setPreservedSearchMode: (mode: EnhancedSearchState | null) => void;
  preservedFilterRef: RefObject<PreservedFilter | null>;
  memoizedColumns: SearchColumn[];
  isEditingSecondOperator: boolean;
  setIsEditingSecondOperator: (editing: boolean) => void;
  setEditingBadge: (badge: EditingBadgeState | null) => void;
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
  setIsEditingSecondOperator: (editing: boolean) => void,
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

  // N-CONDITION SUPPORT: If 3+ conditions, use buildNConditions to preserve all
  // This ensures condition 2+ are not lost when editing condition 1's column
  const preserved = preservedFilterRef.current;
  if ((preserved?.conditions?.length ?? 0) >= 3) {
    const conditions = preserved!.conditions!;
    const joins = preserved!.joins || [];
    const defaultField = conditions[0]?.field || firstCol;

    // Check if preserved operator is compatible with new column type
    const secondCondOp = conditions[1]?.operator;
    const isSecondOpCompatible = isOperatorCompatibleWithColumn(
      column,
      secondCondOp || ''
    );

    if (isSecondOpCompatible) {
      // Build updated conditions with new column at index 1
      const updatedConditions = conditions.map((cond, idx) => {
        if (idx === 1) {
          return {
            field: column.field,
            operator: cond.operator || '',
            value: cond.value || '',
            valueTo: cond.valueTo,
          };
        }
        return {
          field: cond.field || '',
          operator: cond.operator || '',
          value: cond.value || '',
          valueTo: cond.valueTo,
        };
      });

      newValue = PatternBuilder.buildNConditions(
        updatedConditions,
        joins,
        true, // isMultiColumn since we're changing column
        defaultField,
        { confirmed: true }
      );

      // Clear preserved state
      preservedFilterRef.current = null;
      setPreservedSearchMode(null);

      setFilterValue(newValue, onChange, inputRef);

      setTimeout(() => {
        inputRef?.current?.focus();
      }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
      return;
    }
    // If operator not compatible, fall through to open operator selector
    // The existing code will handle this case
  }

  // Check if we have preserved second operator/value (from handleEditSecondColumn)
  const secondCondOp = preservedFilterRef.current?.conditions?.[1]?.operator;
  if (secondCondOp && secondCondOp.trim() !== '') {
    const preserved = preservedFilterRef.current!;
    const secondCondVal = preserved.conditions?.[1]?.value;
    const secondCondValTo = preserved.conditions?.[1]?.valueTo;

    // Check if preserved operator is compatible with new column type
    const isSecondOpCompatible = isOperatorCompatibleWithColumn(
      column,
      secondCondOp
    );

    if (isSecondOpCompatible) {
      // Operator is compatible - restore pattern with preserved operator
      if (secondCondVal && secondCondVal.trim() !== '') {
        // Full multi-column with second value
        newValue = PatternBuilder.buildMultiColumnWithValueTo(
          firstCol,
          firstOp,
          firstVal,
          firstValTo,
          join,
          column.field,
          secondCondOp,
          secondCondVal,
          secondCondValTo
        );
      } else {
        // Multi-column with operator but no second value
        if (firstValTo) {
          newValue = `#${firstCol} #${firstOp} ${firstVal} #to ${firstValTo} #${join.toLowerCase()} #${column.field} #${secondCondOp} `;
        } else {
          newValue = PatternBuilder.multiColumnWithOperator(
            firstCol,
            firstOp,
            firstVal,
            join,
            column.field,
            secondCondOp
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

      // Update preservedSearchMode with new second column field
      if (preservedFilterRef.current?.conditions?.[1]) {
        preservedFilterRef.current.conditions[1].field = column.field;
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
      setIsEditingSecondOperator(true);
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
    setIsEditingSecondOperator(true);
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
  const preserved = preservedFilterRef.current!;
  // Access first condition from conditions array
  const firstCond = preserved.conditions?.[0];
  const operator = firstCond?.operator ?? '';
  const value = firstCond?.value ?? '';
  // Access join from joins array
  const join = preserved.joins?.[0];
  // Access second condition from conditions array
  const secondCond = preserved.conditions?.[1];
  const secondCondOperator = secondCond?.operator;
  const secondCondValue = secondCond?.value;
  const secondCondField = secondCond?.field;
  const isMultiColumnPreserved = preserved.isMultiColumn;

  let newValue: string;

  // Check if operator is compatible with new column type
  const isOperatorCompatible = isOperatorCompatibleWithColumn(column, operator);

  // N-CONDITION SUPPORT: If 3+ conditions, use buildNConditions to preserve all
  // This ensures condition 2+ are not lost when editing condition 0's column
  if ((preserved.conditions?.length ?? 0) >= 3 && isOperatorCompatible) {
    const conditions = preserved.conditions!;
    const joins = preserved.joins || [];
    const defaultField = column.field; // New column becomes the default field

    // Build updated conditions with new column at index 0
    const updatedConditions = conditions.map((cond, idx) => {
      if (idx === 0) {
        return {
          field: column.field,
          operator: cond.operator || '',
          value: cond.value || '',
          valueTo: cond.valueTo,
        };
      }
      return {
        field: cond.field || '',
        operator: cond.operator || '',
        value: cond.value || '',
        valueTo: cond.valueTo,
      };
    });

    newValue = PatternBuilder.buildNConditions(
      updatedConditions,
      joins,
      preserved.isMultiColumn || true, // Force multi-column since we're changing column
      defaultField,
      { confirmed: true }
    );

    // Clear preserved state
    preservedFilterRef.current = null;
    setPreservedSearchMode(null);

    setFilterValue(newValue, onChange, inputRef);

    setTimeout(() => {
      inputRef?.current?.focus();
    }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
    return;
  }

  if (isOperatorCompatible) {
    // Handle multi-condition or partial multi-condition
    if (join && secondCondOperator) {
      const isMultiColumn = isMultiColumnPreserved && !!secondCondField;

      if (isMultiColumn) {
        // MULTI-COLUMN FILTER
        const secondColumn = memoizedColumns.find(
          col => col.field === secondCondField
        );

        if (secondColumn) {
          const isSecondOperatorCompatible = isOperatorCompatibleWithColumn(
            secondColumn,
            secondCondOperator!
          );

          if (isSecondOperatorCompatible) {
            const valueTo = firstCond?.valueTo;
            const secondCondValueTo = secondCond?.valueTo;

            if (secondCondValue && secondCondValue.trim() !== '') {
              newValue = PatternBuilder.buildMultiColumnWithValueTo(
                column.field,
                operator,
                value,
                valueTo,
                join,
                secondCondField!,
                secondCondOperator!,
                secondCondValue,
                secondCondValueTo
              );
            } else {
              newValue = PatternBuilder.multiColumnWithOperator(
                column.field,
                operator,
                value,
                join,
                secondCondField!,
                secondCondOperator!,
                valueTo
              );
            }
          } else {
            // Second operator not compatible
            const valueTo = firstCond?.valueTo;
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
          const valueTo = firstCond?.valueTo;
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
          secondCondOperator!
        );

        if (isSecondOperatorCompatible) {
          const valueTo = firstCond?.valueTo;
          const secondCondValueTo = secondCond?.valueTo;

          if (secondCondValue && secondCondValue.trim() !== '') {
            newValue = PatternBuilder.buildMultiConditionWithValueTo(
              column.field,
              operator,
              value,
              valueTo,
              join,
              secondCondOperator!,
              secondCondValue,
              secondCondValueTo
            );
          } else {
            if (valueTo) {
              newValue = `#${column.field} #${operator} ${value} #to ${valueTo} #${join.toLowerCase()} #${secondCondOperator} `;
            } else {
              newValue = PatternBuilder.partialMultiWithOperator(
                column.field,
                operator,
                value,
                join,
                secondCondOperator!
              );
            }
          }
        } else {
          // Second operator not compatible
          const valueTo = firstCond?.valueTo;
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
    } else if (join && secondCondField) {
      // Has join and second column but no second operator yet
      if (firstCond?.valueTo) {
        newValue = `#${column.field} #${operator} ${value} #to ${firstCond.valueTo} #${join.toLowerCase()} #${secondCondField} #`;
      } else {
        newValue = `#${column.field} #${operator} ${value} #${join.toLowerCase()} #${secondCondField} #`;
      }
    } else if (join) {
      // Has join but no second column yet
      if (firstCond?.valueTo) {
        newValue = `#${column.field} #${operator} ${value} #to ${firstCond.valueTo} #${join.toLowerCase()} #`;
      } else {
        newValue = `#${column.field} #${operator} ${value} #${join.toLowerCase()} #`;
      }
    } else {
      // Single-condition filter
      if (value && value.trim() !== '') {
        const valueTo = firstCond?.valueTo;
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
      preservedFilterRef.current?.joins?.[0] &&
      preservedFilterRef.current?.conditions?.[1]?.operator
    ) {
      // Update first condition's field
      if (preservedFilterRef.current.conditions?.[0]) {
        preservedFilterRef.current.conditions[0].field = column.field;
        preservedFilterRef.current.conditions[0].operator = '';
      }
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
  setIsEditingSecondOperator: (editing: boolean) => void,
  setEditingBadge: (badge: EditingBadgeState | null) => void,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  inputRef: RefObject<HTMLInputElement | null> | undefined
): void {
  const preserved = preservedFilterRef.current!;
  // Access from scalable structure
  const firstCond = preserved.conditions?.[0];
  const secondCond = preserved.conditions?.[1];
  const joinOp = preserved.joins?.[0] as 'AND' | 'OR';
  const secondCondCol = secondCond?.field;
  const isMultiColumn = preserved.isMultiColumn && secondCondCol;

  let newValue: string;

  // N-CONDITION SUPPORT: If 3+ conditions, use buildNConditions to preserve all
  if ((preserved.conditions?.length ?? 0) >= 3) {
    const conditions = preserved.conditions!;
    const joins = preserved.joins || [];

    // Build updated conditions with new operator at index 1
    const updatedConditions = conditions.map((cond, idx) => {
      if (idx === 1) {
        return {
          field: cond.field || '',
          operator: operator.value,
          value: cond.value || '',
          valueTo: operator.value === 'inRange' ? cond.valueTo : undefined,
        };
      }
      return {
        field: cond.field || '',
        operator: cond.operator || '',
        value: cond.value || '',
        valueTo: cond.valueTo,
      };
    });

    newValue = PatternBuilder.buildNConditions(
      updatedConditions,
      joins,
      preserved.isMultiColumn || true,
      columnName,
      { confirmed: true }
    );

    preservedFilterRef.current = null;
    setPreservedSearchMode(null);
    setIsEditingSecondOperator(false);
    setFilterValue(newValue, onChange, inputRef);

    setTimeout(() => {
      inputRef?.current?.focus();
    }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
    return;
  }

  // Special handling: changing to Between when no secondCondValueTo exists
  if (
    operator.value === 'inRange' &&
    secondCond?.value &&
    !secondCond?.valueTo
  ) {
    const firstPart =
      firstCond?.operator === 'inRange' && firstCond?.valueTo
        ? `#${columnName} #${firstCond.operator} ${firstCond.value} #to ${firstCond.valueTo}`
        : `#${columnName} #${firstCond?.operator} ${firstCond?.value}`;

    if (isMultiColumn) {
      newValue = `${firstPart} #${joinOp.toLowerCase()} #${secondCondCol} #${operator.value} ${secondCond.value}##`;
    } else {
      newValue = `${firstPart} #${joinOp.toLowerCase()} #${operator.value} ${secondCond.value}##`;
    }

    // Update preserved state - update second condition operator
    if (preserved.conditions?.[1]) {
      preserved.conditions[1].operator = 'inRange';
    }

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

    setIsEditingSecondOperator(false);
    setFilterValue(newValue, onChange, inputRef);

    // Enter inline edit mode with dash appended
    setTimeout(() => {
      setEditingBadge({
        conditionIndex: 1,
        field: 'value',
        value: `${secondCond.value}-`,
      });
    }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);

    return;
  }

  // Normal case with second value
  if (secondCond?.value) {
    const secondValTo =
      operator.value === 'inRange' ? secondCond.valueTo : undefined;

    if (isMultiColumn) {
      newValue = PatternBuilder.buildMultiColumnWithValueTo(
        columnName,
        firstCond?.operator ?? '',
        firstCond?.value ?? '',
        firstCond?.valueTo,
        joinOp,
        secondCondCol!,
        operator.value,
        secondCond.value,
        secondValTo
      );
    } else {
      newValue = PatternBuilder.buildMultiConditionWithValueTo(
        columnName,
        firstCond?.operator ?? '',
        firstCond?.value ?? '',
        firstCond?.valueTo,
        joinOp,
        operator.value,
        secondCond.value,
        secondValTo
      );
    }

    preservedFilterRef.current = null;
    setPreservedSearchMode(null);
  } else {
    // No second value yet - ready for input
    if (firstCond?.valueTo) {
      if (isMultiColumn) {
        newValue = `#${columnName} #${firstCond.operator} ${firstCond.value} #to ${firstCond.valueTo} #${joinOp.toLowerCase()} #${secondCondCol} #${operator.value} `;
      } else {
        newValue = `#${columnName} #${firstCond.operator} ${firstCond.value} #to ${firstCond.valueTo} #${joinOp.toLowerCase()} #${operator.value} `;
      }
    } else {
      if (isMultiColumn) {
        newValue = PatternBuilder.multiColumnWithOperator(
          columnName,
          firstCond?.operator ?? '',
          firstCond?.value ?? '',
          joinOp,
          secondCondCol!,
          operator.value
        );
      } else {
        newValue = PatternBuilder.partialMultiWithOperator(
          columnName,
          firstCond?.operator ?? '',
          firstCond?.value ?? '',
          joinOp,
          operator.value
        );
      }
    }
  }

  setIsEditingSecondOperator(false);
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
  setEditingBadge: (badge: EditingBadgeState | null) => void,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  inputRef: RefObject<HTMLInputElement | null> | undefined
): void {
  const preserved = preservedFilterRef.current!;
  // Access from scalable structure
  const firstCond = preserved.conditions?.[0];
  const secondCond = preserved.conditions?.[1];
  const joinOp = preserved.joins?.[0];
  let newValue: string;

  // N-CONDITION SUPPORT: If 3+ conditions, use buildNConditions to preserve all
  if ((preserved.conditions?.length ?? 0) >= 3) {
    const conditions = preserved.conditions!;
    const joins = preserved.joins || [];

    // Build updated conditions with new operator at index 0
    const updatedConditions = conditions.map((cond, idx) => {
      if (idx === 0) {
        return {
          field: cond.field || columnName,
          operator: operator.value,
          value: cond.value || '',
          valueTo: operator.value === 'inRange' ? cond.valueTo : undefined,
        };
      }
      return {
        field: cond.field || '',
        operator: cond.operator || '',
        value: cond.value || '',
        valueTo: cond.valueTo,
      };
    });

    newValue = PatternBuilder.buildNConditions(
      updatedConditions,
      joins,
      preserved.isMultiColumn || true,
      columnName,
      { confirmed: true }
    );

    preservedFilterRef.current = null;
    setPreservedSearchMode(null);
    setFilterValue(newValue, onChange, inputRef);

    setTimeout(() => {
      inputRef?.current?.focus();
    }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
    return;
  }

  // Special handling: changing to Between when value exists but no valueTo
  if (operator.value === 'inRange' && firstCond?.value && !firstCond?.valueTo) {
    // Check if multi-condition
    if (joinOp && secondCond?.operator) {
      const secondCondCol = secondCond.field;
      const isMultiColumn = preserved.isMultiColumn && secondCondCol;

      if (isMultiColumn) {
        newValue = PatternBuilder.buildMultiColumnWithValueTo(
          columnName,
          operator.value,
          firstCond.value,
          undefined,
          joinOp,
          secondCondCol!,
          secondCond.operator,
          secondCond.value!,
          secondCond.valueTo
        );
      } else {
        newValue = PatternBuilder.buildMultiConditionWithValueTo(
          columnName,
          operator.value,
          firstCond.value,
          undefined,
          joinOp,
          secondCond.operator,
          secondCond.value!,
          secondCond.valueTo
        );
      }
    } else {
      // Single condition
      newValue = `#${columnName} #${operator.value} ${firstCond.value}##`;
    }

    setFilterValue(newValue, onChange, inputRef);

    // Enter inline edit for first value with dash
    setTimeout(() => {
      setEditingBadge({
        conditionIndex: 0,
        field: 'value',
        value: `${firstCond.value}-`,
      });
    }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);

    return;
  }

  // Normal case with multi-condition
  if (joinOp && secondCond?.operator) {
    const secondCondCol = secondCond.field;
    const isMultiColumn = preserved.isMultiColumn && secondCondCol;
    const valueTo =
      operator.value === 'inRange' ? firstCond?.valueTo : undefined;

    if (isMultiColumn) {
      newValue = PatternBuilder.buildMultiColumnWithValueTo(
        columnName,
        operator.value,
        firstCond?.value ?? '',
        valueTo,
        joinOp,
        secondCondCol!,
        secondCond.operator,
        secondCond.value!,
        secondCond.valueTo
      );
    } else {
      newValue = PatternBuilder.buildMultiConditionWithValueTo(
        columnName,
        operator.value,
        firstCond?.value ?? '',
        valueTo,
        joinOp,
        secondCond.operator,
        secondCond.value!,
        secondCond.valueTo
      );
    }
  } else if (firstCond?.value && firstCond.value.trim() !== '') {
    // Single condition with value
    const valueTo =
      operator.value === 'inRange' ? firstCond.valueTo : undefined;
    if (valueTo) {
      newValue = PatternBuilder.betweenConfirmed(
        columnName,
        firstCond.value,
        valueTo
      );
    } else {
      newValue = PatternBuilder.confirmed(
        columnName,
        operator.value,
        firstCond.value
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
    isEditingSecondOperator,
    setIsEditingSecondOperator,
    setEditingBadge,
  } = props;

  // ============================================================================
  // Column Selection Handler
  // ============================================================================
  const handleColumnSelect = useCallback(
    (column: SearchColumn) => {
      const filter = searchMode.filterSearch;
      const activeIdx = searchMode.activeConditionIndex ?? 0;

      // CASE 0-EDIT: EDITING an existing condition's column (N >= 2)
      // When preservedFilterRef has the condition we're editing, rebuild pattern with new column
      const isEditingConditionNColumn =
        activeIdx >= 2 &&
        searchMode.showColumnSelector &&
        preservedFilterRef.current?.conditions?.[activeIdx];

      if (isEditingConditionNColumn) {
        const preserved = preservedFilterRef.current!;
        const conditions = preserved.conditions!;
        const joins = preserved.joins || [];
        const defaultField = conditions[0]?.field || filter?.field || '';

        // Build updated conditions array with new column at edited index
        const updatedConditions = conditions.map((cond, idx) => {
          if (idx === activeIdx) {
            // Replace column for this condition, keep operator and value
            return {
              field: column.field,
              operator: cond.operator || '',
              value: cond.value || '',
              valueTo: cond.valueTo,
            };
          }
          return {
            field: cond.field,
            operator: cond.operator || '',
            value: cond.value || '',
            valueTo: cond.valueTo,
          };
        });

        // Check if operator is compatible with new column type
        const editedCondOp = conditions[activeIdx]?.operator;
        const isOpCompatible = isOperatorCompatibleWithColumn(
          column,
          editedCondOp || ''
        );

        if (isOpCompatible && conditions[activeIdx]?.value) {
          // Operator compatible and has value - rebuild full pattern
          const newValue = PatternBuilder.buildNConditions(
            updatedConditions,
            joins,
            true, // isMultiColumn since we're changing a column
            defaultField,
            { confirmed: true }
          );

          preservedFilterRef.current = null;
          setPreservedSearchMode(null);
          setFilterValue(newValue, onChange, inputRef);
        } else {
          // Operator not compatible or no value - open operator selector
          const conditionsUpToEdit = updatedConditions
            .slice(0, activeIdx)
            .map(c => ({
              field: c.field,
              operator: c.operator,
              value: c.value,
              valueTo: c.valueTo,
            }));
          const joinsUpToEdit = joins.slice(0, activeIdx - 1);
          const joinForEdit = joins[activeIdx - 1] || 'AND';

          const basePattern = PatternBuilder.buildNConditions(
            conditionsUpToEdit,
            joinsUpToEdit,
            true,
            defaultField,
            { confirmed: false }
          );

          const newValue = `${basePattern} #${joinForEdit.toLowerCase()} #${column.field} #`;

          // Update preserved state with new column
          if (preserved.conditions?.[activeIdx]) {
            preserved.conditions[activeIdx].field = column.field;
          }

          setFilterValue(newValue, onChange, inputRef);
        }

        setTimeout(() => {
          inputRef?.current?.focus();
        }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
        return;
      }

      // CASE 0a: Adding NEW condition to existing multi-condition filter
      // When activeConditionIndex >= existing complete conditions, we're adding a new condition
      // Check both filter.conditions and partialConditions for robustness
      const existingConditionsCount = filter?.conditions?.length ?? 0;
      const partialConditionsCount = searchMode.partialConditions?.length ?? 0;

      // We're adding a new condition if:
      // 1. We have 2+ complete conditions (filter.conditions or partialConditions with values)
      // 2. activeConditionIndex points to a new slot (>= existingConditionsCount)
      // 3. Column selector is showing (partialConditions has empty last slot)
      // 4. NOT editing (preservedFilterRef doesn't have this condition)
      const hasMultipleCompleteConditions =
        existingConditionsCount >= 2 ||
        (partialConditionsCount >= 3 &&
          searchMode.partialConditions?.[0]?.value &&
          searchMode.partialConditions?.[1]?.value);

      const isAddingNewConditionToMulti =
        hasMultipleCompleteConditions &&
        activeIdx >= 2 &&
        searchMode.showColumnSelector &&
        !preservedFilterRef.current?.conditions?.[activeIdx]; // NOT editing

      if (isAddingNewConditionToMulti) {
        // Build pattern with all existing conditions + new column + operator selector
        // Use filter.conditions if available, otherwise build from partialConditions
        const existingConditions =
          filter?.conditions ||
          (searchMode.partialConditions || [])
            .filter(c => c.operator && c.value)
            .map(c => ({
              field: c.field || '',
              column: c.column!,
              operator: c.operator!,
              value: c.value!,
              valueTo: c.valueTo,
            }));

        const existingJoins = filter?.joins ||
          searchMode.joins?.slice(0, existingConditions.length - 1) || [
            searchMode.partialJoin || 'AND',
          ];
        const defaultField =
          existingConditions[0]?.field || filter?.field || '';

        // Get the new join from joins array (the last join is for connecting to new condition)
        const newJoinIndex = existingConditions.length - 1;
        const newJoin =
          searchMode.joins?.[newJoinIndex] || searchMode.partialJoin || 'AND';

        // Determine if multi-column from filter or by checking field names
        const isMultiColumn =
          filter?.isMultiColumn ||
          existingConditions.some(
            (c, i) => i > 0 && c.field !== existingConditions[0]?.field
          );

        // Build base pattern with all existing conditions
        const basePattern = PatternBuilder.buildNConditions(
          existingConditions.map(c => ({
            field: c.field,
            operator: c.operator,
            value: c.value,
            valueTo: c.valueTo,
          })),
          existingJoins,
          isMultiColumn,
          defaultField,
          { confirmed: false }
        );

        // Add new join + new column + operator selector
        const newValue = `${basePattern} #${newJoin.toLowerCase()} #${column.field} #`;

        // Clear any stale state that might interfere
        preservedFilterRef.current = null;
        setPreservedSearchMode(null);
        setIsEditingSecondOperator(false); // Ensure this is false for new condition

        setFilterValue(newValue, onChange, inputRef);

        setTimeout(() => {
          inputRef?.current?.focus();
        }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
        return;
      }

      // CASE 0b: MULTI-COLUMN - selecting column for condition[1] after join operator
      // Use scalable check: activeConditionIndex > 0 (but only for condition 1)
      const isSelectingConditionNColumn =
        isBuildingConditionN(searchMode) &&
        searchMode.filterSearch &&
        searchMode.partialJoin &&
        !isAddingNewConditionToMulti;

      if (isSelectingConditionNColumn) {
        handleColumnSelectMultiColumn(
          column,
          searchMode,
          preservedFilterRef,
          preservedSearchMode,
          setPreservedSearchMode,
          setIsEditingSecondOperator,
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
      setIsEditingSecondOperator,
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
        isEditingSecondOperator &&
        preservedFilterRef.current?.joins?.[0] &&
        (preservedFilterRef.current.joins[0] === 'AND' ||
          preservedFilterRef.current.joins[0] === 'OR')
      ) {
        handleOperatorSelectEditSecond(
          operator,
          columnName,
          preservedFilterRef,
          preservedSearchMode,
          setPreservedSearchMode,
          setIsEditingSecondOperator,
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

      // CASE 2b-EDIT: EDITING condition N's operator (N >= 2)
      // When preservedFilterRef has the condition we're editing, rebuild pattern with new operator
      const activeIdx = searchMode.activeConditionIndex ?? 0;
      const isEditingConditionNOperator =
        activeIdx >= 2 &&
        searchMode.showOperatorSelector &&
        preservedFilterRef.current?.conditions?.[activeIdx];

      if (isEditingConditionNOperator) {
        const preserved = preservedFilterRef.current!;
        const conditions = preserved.conditions!;
        const joins = preserved.joins || [];
        const defaultField =
          conditions[0]?.field || searchMode.filterSearch?.field || '';

        // Build updated conditions array with new operator at edited index
        const updatedConditions = conditions.map((cond, idx) => {
          if (idx === activeIdx) {
            // Replace operator for this condition, keep column and value
            return {
              field: cond.field || '',
              operator: operator.value,
              value: cond.value || '',
              valueTo: cond.valueTo,
            };
          }
          return {
            field: cond.field || '',
            operator: cond.operator || '',
            value: cond.value || '',
            valueTo: cond.valueTo,
          };
        });

        // Build full pattern with updated operator
        const newValue = PatternBuilder.buildNConditions(
          updatedConditions,
          joins,
          preserved.isMultiColumn || true, // Likely multi-column for N >= 2
          defaultField,
          { confirmed: true }
        );

        preservedFilterRef.current = null;
        setPreservedSearchMode(null);
        setFilterValue(newValue, onChange, inputRef);

        setTimeout(() => {
          inputRef?.current?.focus();
        }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
        return;
      }

      // CASE 3a: Selecting operator for condition N+1 (adding to existing multi-condition)
      // When we have 2+ complete conditions and selecting operator for the new condition
      const filter = searchMode.filterSearch;
      const existingConditionsCount = filter?.conditions?.length ?? 0;
      const partialConditionsCount = searchMode.partialConditions?.length ?? 0;

      // Check if we're adding operator to a NEW condition (condition N+1)
      const hasMultipleCompleteConditions =
        existingConditionsCount >= 2 ||
        (partialConditionsCount >= 3 &&
          searchMode.partialConditions?.[0]?.value &&
          searchMode.partialConditions?.[1]?.value);

      const lastPartialCondition =
        searchMode.partialConditions?.[partialConditionsCount - 1];

      // Check if we're at the last partial condition AND operator selector is showing
      // This is more robust than checking lastPartialCondition?.column which might fail
      // if findColumn didn't find the column during parsing
      const isAddingOperatorToNewCondition =
        hasMultipleCompleteConditions &&
        activeIdx >= 2 &&
        searchMode.showOperatorSelector && // Operator selector is open
        !preservedFilterRef.current?.conditions?.[activeIdx] && // NOT editing
        (lastPartialCondition?.column || // Has column (parsing succeeded)
          (searchMode.selectedColumn && // Or selectedColumn is set (fallback)
            partialConditionsCount >= 3)); // And we have enough partial conditions

      if (isAddingOperatorToNewCondition) {
        // Build pattern with all existing conditions + new column + new operator
        const existingConditions =
          filter?.conditions ||
          (searchMode.partialConditions || [])
            .filter(c => c.operator && c.value)
            .map(c => ({
              field: c.field || '',
              column: c.column!,
              operator: c.operator!,
              value: c.value!,
              valueTo: c.valueTo,
            }));

        const existingJoins = filter?.joins ||
          searchMode.joins?.slice(0, existingConditions.length - 1) || [
            searchMode.partialJoin || 'AND',
          ];

        const isMultiColumn =
          filter?.isMultiColumn ||
          existingConditions.some(
            (c, i) => i > 0 && c.field !== existingConditions[0]?.field
          );

        const defaultField =
          existingConditions[0]?.field || filter?.field || '';

        // Get the new join (last join in the array)
        const newJoinIndex = existingConditions.length - 1;
        const newJoin =
          searchMode.joins?.[newJoinIndex] || searchMode.partialJoin || 'AND';

        // Get the new column from last partial condition or selectedColumn
        // Fallback: extract from the value pattern (e.g., "#col1 #op val #and #col2 #")
        let newColumnField =
          lastPartialCondition?.column?.field ||
          searchMode.selectedColumn?.field ||
          '';

        // If still empty, try to extract from the value pattern
        if (!newColumnField) {
          // Pattern: ...#join #column # at the end
          const colFromValueMatch = value.match(
            /#(?:and|or)\s+#([^\s#]+)\s+#\s*$/i
          );
          if (colFromValueMatch) {
            newColumnField = colFromValueMatch[1];
          }
        }

        // Guard: need a valid column field to proceed
        if (newColumnField) {
          // Build base pattern with all existing conditions
          const basePattern = PatternBuilder.buildNConditions(
            existingConditions.map(c => ({
              field: c.field,
              operator: c.operator,
              value: c.value,
              valueTo: c.valueTo,
            })),
            existingJoins,
            isMultiColumn,
            defaultField,
            { confirmed: false }
          );

          // Add new join + new column + new operator + space for value
          const newValue = `${basePattern} #${newJoin.toLowerCase()} #${newColumnField} #${operator.value} `;

          // Clear any stale state
          preservedFilterRef.current = null;
          setPreservedSearchMode(null);
          setIsEditingSecondOperator(false);

          setFilterValue(newValue, onChange, inputRef);

          setTimeout(() => {
            inputRef?.current?.focus();
          }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
          return;
        }
        // If newColumnField is empty, fall through to other cases
      }

      // CASE 3b: Selecting operator for condition[1] (second condition) in partial multi-condition
      // Note: Don't require isConfirmed - when building new multi-column filter,
      // the pattern is "#col1 #op1 val1 #and #col2 #" which has no ## marker
      // IMPORTANT: Only for condition 1 (index 1), NOT for condition 2+ which should use CASE 3a
      // Note: activeIdx is already defined above in CASE 2b-EDIT
      if (
        activeIdx === 1 && // Only for condition 1, not condition 2+
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
      isEditingSecondOperator,
      preservedFilterRef,
      preservedSearchMode,
      setPreservedSearchMode,
      setIsEditingSecondOperator,
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
      const editingJoinIndex = searchMode.editingJoinIndex;

      let newValue: string;

      // CASE 1: Editing join at specific index with preserved N-conditions
      // Scalable: supports editing any join at index 0 to N-1
      if (
        preserved &&
        preserved.conditions &&
        preserved.conditions.length > 0
      ) {
        const conditions = preserved.conditions;
        const defaultField = conditions[0]?.field || '';
        const isMultiColumn = preserved.isMultiColumn || false;

        // Build new joins array with updated join at editingJoinIndex
        const newJoins: ('AND' | 'OR')[] = [...(preserved.joins || [])];
        const targetJoinIndex = editingJoinIndex ?? 0;

        // Ensure joins array is long enough
        while (newJoins.length <= targetJoinIndex) {
          newJoins.push('AND');
        }
        newJoins[targetJoinIndex] = joinOperator;

        // Check if all conditions have values (confirmed state)
        const allConditionsComplete = conditions.every(
          c => c.value && c.value.trim() !== ''
        );

        if (allConditionsComplete) {
          // Full N-condition confirmed
          newValue = PatternBuilder.buildNConditions(
            conditions.map(c => ({
              field: c.field,
              operator: c.operator || '',
              value: c.value || '',
              valueTo: c.valueTo,
            })),
            newJoins,
            isMultiColumn,
            defaultField,
            { confirmed: true }
          );
        } else {
          // Partial N-condition (last condition incomplete)
          newValue = PatternBuilder.buildNConditions(
            conditions.map(c => ({
              field: c.field,
              operator: c.operator || '',
              value: c.value || '',
              valueTo: c.valueTo,
            })),
            newJoins,
            isMultiColumn,
            defaultField,
            { confirmed: false }
          );
        }

        preservedFilterRef.current = null;
        setPreservedSearchMode(null);
      } else if (searchMode.filterSearch?.isConfirmed) {
        // CASE 2: Normal join selection after confirmed filter (adding new condition)
        const filter = searchMode.filterSearch;

        // Extract multi-condition preservation
        const extraction = extractMultiConditionPreservation(searchMode);
        preservedFilterRef.current = extraction;

        // Check if this is a multi-condition filter
        if (
          filter.isMultiCondition &&
          filter.conditions &&
          filter.conditions.length > 0
        ) {
          // Multi-condition: build pattern with all existing conditions + new join + column selector
          const conditions = filter.conditions;
          const existingJoins = filter.joins || [filter.joinOperator || 'AND'];
          const isMultiColumn = filter.isMultiColumn || false;
          const defaultField = conditions[0]?.field || filter.field;

          // Build pattern with all existing conditions (confirmed, no trailing marker)
          const basePattern = PatternBuilder.buildNConditions(
            conditions.map(c => ({
              field: c.field,
              operator: c.operator,
              value: c.value,
              valueTo: c.valueTo,
            })),
            existingJoins,
            isMultiColumn,
            defaultField,
            { confirmed: false } // No ## or #
          );

          // Add new join + column selector
          newValue = `${basePattern} #${joinOperator.toLowerCase()} #`;
        } else if (filter.valueTo) {
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
