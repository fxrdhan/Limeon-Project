/**
 * Column Selection Hook
 *
 * Extracted from useSelectionHandlers.ts to handle column selection logic.
 * Supports multi-column filters, edit mode restoration, and N-condition patterns.
 */

import type { RefObject } from 'react';
import { SEARCH_CONSTANTS } from '../../constants';
import type { EnhancedSearchState, SearchColumn } from '../../types';
import type { PreservedFilter } from '../../utils/handlerHelpers';
import { setFilterValue } from '../../utils/handlerHelpers';
import { isOperatorCompatibleWithColumn } from '../../utils/operatorUtils';
import { PatternBuilder } from '../../utils/PatternBuilder';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get active condition index from searchMode.
 */
export function getActiveConditionIndex(
  searchMode: EnhancedSearchState
): number {
  return searchMode.activeConditionIndex ?? 0;
}

/**
 * Check if we're building a condition at index > 0.
 */
export function isBuildingConditionN(searchMode: EnhancedSearchState): boolean {
  return getActiveConditionIndex(searchMode) > 0;
}

/**
 * Get column at specific condition index from scalable partialConditions.
 */
export function getColumnAt(
  searchMode: EnhancedSearchState,
  index: number
): SearchColumn | undefined {
  return searchMode.partialConditions?.[index]?.column;
}

// ============================================================================
// Column Selection Handlers
// ============================================================================

/**
 * CASE 0: Multi-column selection - selecting second column after join operator
 * Pattern: #col1 #op val #and # → selecting col2 → #col1 #op val #and #col2 #
 */
export function handleColumnSelectMultiColumn(
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
  const preserved = preservedFilterRef.current;
  const secondCondOp = preserved?.conditions?.[1]?.operator;

  if (secondCondOp && secondCondOp.trim() !== '') {
    const conditions = preserved!.conditions!;
    const joins = preserved!.joins || [join];
    const defaultField = conditions[0]?.field || firstCol;
    const secondCondVal = conditions[1]?.value;

    const isSecondOpCompatible = isOperatorCompatibleWithColumn(
      column,
      secondCondOp
    );

    if (isSecondOpCompatible) {
      if (secondCondVal && secondCondVal.trim() !== '') {
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
          true,
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
      } else {
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

        preservedFilterRef.current = null;
        setPreservedSearchMode(null);
      }
    } else {
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

      if (preserved?.conditions?.[1]) {
        preserved.conditions[1].field = column.field;
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
    if (firstValTo) {
      newValue = `#${firstCol} #${firstOp} ${firstVal} #to ${firstValTo} #${join.toLowerCase()} #${column.field} #`;
    } else {
      newValue = `#${firstCol} #${firstOp} ${firstVal} #${join.toLowerCase()} #${column.field} #`;
    }

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
export function handleColumnSelectWithPreservedFilter(
  column: SearchColumn,
  preservedFilterRef: RefObject<PreservedFilter | null>,
  preservedSearchMode: EnhancedSearchState | null,
  setPreservedSearchMode: (mode: EnhancedSearchState | null) => void,
  memoizedColumns: SearchColumn[],
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  inputRef: RefObject<HTMLInputElement | null> | undefined
): void {
  const preserved = preservedFilterRef.current!;
  const firstCond = preserved.conditions?.[0];
  const operator = firstCond?.operator ?? '';
  const value = firstCond?.value ?? '';
  const join = preserved.joins?.[0];
  const secondCond = preserved.conditions?.[1];
  const secondCondOperator = secondCond?.operator;
  const secondCondValue = secondCond?.value;
  const secondCondField = secondCond?.field;
  const isMultiColumnPreserved = preserved.isMultiColumn;

  let newValue: string;
  const isOperatorCompatible = isOperatorCompatibleWithColumn(column, operator);

  if (isOperatorCompatible) {
    if (join && secondCondOperator) {
      const isMultiColumn = isMultiColumnPreserved && !!secondCondField;
      const conditions = preserved.conditions!;
      const joins = preserved.joins || [join];

      const secondColumn = isMultiColumn
        ? memoizedColumns.find(col => col.field === secondCondField)
        : column;
      const isSecondOperatorCompatible = secondColumn
        ? isOperatorCompatibleWithColumn(secondColumn, secondCondOperator!)
        : false;

      if (
        isSecondOperatorCompatible &&
        secondCondValue &&
        secondCondValue.trim() !== ''
      ) {
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
          isMultiColumn || false,
          column.field,
          { confirmed: true }
        );
      } else if (isSecondOperatorCompatible) {
        const valueTo = firstCond?.valueTo;
        if (isMultiColumn) {
          newValue = PatternBuilder.multiColumnWithOperator(
            column.field,
            operator,
            value,
            join,
            secondCondField!,
            secondCondOperator!,
            valueTo
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
    } else if (join && secondCondField) {
      if (firstCond?.valueTo) {
        newValue = `#${column.field} #${operator} ${value} #to ${firstCond.valueTo} #${join.toLowerCase()} #${secondCondField} #`;
      } else {
        newValue = `#${column.field} #${operator} ${value} #${join.toLowerCase()} #${secondCondField} #`;
      }
    } else if (join) {
      if (firstCond?.valueTo) {
        newValue = `#${column.field} #${operator} ${value} #to ${firstCond.valueTo} #${join.toLowerCase()} #`;
      } else {
        newValue = `#${column.field} #${operator} ${value} #${join.toLowerCase()} #`;
      }
    } else {
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

    preservedFilterRef.current = null;
    setPreservedSearchMode(null);
  } else {
    newValue = PatternBuilder.columnWithOperatorSelector(column.field);

    if (
      preservedFilterRef.current?.joins?.[0] &&
      preservedFilterRef.current?.conditions?.[1]?.operator
    ) {
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
