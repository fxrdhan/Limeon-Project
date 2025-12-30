/**
 * Operator Selection Hook
 *
 * Extracted from useSelectionHandlers.ts to handle operator selection logic.
 * Supports edit mode, multi-condition patterns, and Between operator handling.
 */

import type { RefObject } from 'react';
import { SEARCH_CONSTANTS } from '../../constants';
import type { EnhancedSearchState, FilterOperator } from '../../types';
import { PatternBuilder } from '../../utils/PatternBuilder';
import type { PreservedFilter } from '../../utils/handlerHelpers';
import { setFilterValue } from '../../utils/handlerHelpers';
import type { EditingBadgeState } from '../useSelectionHandlers';
import { getColumnAt, isBuildingConditionN } from './useColumnSelection';

// ============================================================================
// Operator Selection Handlers
// ============================================================================

/**
 * CASE 1: Editing second operator
 */
export function handleOperatorSelectEditSecond(
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
  const firstCond = preserved.conditions?.[0];
  const secondCond = preserved.conditions?.[1];
  const joinOp = preserved.joins?.[0] as 'AND' | 'OR';
  const secondCondCol = secondCond?.field;
  const isMultiColumn = preserved.isMultiColumn && secondCondCol;

  let newValue: string;
  const conditions = preserved.conditions!;
  const joins = preserved.joins || [joinOp];

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

    setTimeout(() => {
      setEditingBadge({
        conditionIndex: 1,
        field: 'value',
        value: `${secondCond.value}-`,
      });
    }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);

    return;
  }

  if (secondCond?.value) {
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
      !!isMultiColumn,
      columnName,
      { confirmed: true }
    );

    preservedFilterRef.current = null;
    setPreservedSearchMode(null);
  } else {
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
export function handleOperatorSelectEditFirst(
  operator: FilterOperator,
  columnName: string,
  preservedFilterRef: RefObject<PreservedFilter | null>,
  setPreservedSearchMode: (mode: EnhancedSearchState | null) => void,
  setEditingBadge: (badge: EditingBadgeState | null) => void,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  inputRef: RefObject<HTMLInputElement | null> | undefined
): void {
  const preserved = preservedFilterRef.current!;
  const firstCond = preserved.conditions?.[0];
  const secondCond = preserved.conditions?.[1];
  const joinOp = preserved.joins?.[0];
  const conditions = preserved.conditions!;
  const joins = preserved.joins || (joinOp ? [joinOp] : []);
  let newValue: string;

  // Special handling: changing to Between when value exists but no valueTo
  if (operator.value === 'inRange' && firstCond?.value && !firstCond?.valueTo) {
    if (joinOp && secondCond?.operator) {
      const secondCondCol = secondCond.field;
      const isMultiColumn = preserved.isMultiColumn && secondCondCol;

      const updatedConditions = conditions.map((cond, idx) => {
        if (idx === 0) {
          return {
            field: cond.field || columnName,
            operator: operator.value,
            value: cond.value || '',
            valueTo: undefined,
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
        !!isMultiColumn,
        columnName,
        { confirmed: true }
      );
    } else {
      newValue = `#${columnName} #${operator.value} ${firstCond.value}##`;
    }

    setFilterValue(newValue, onChange, inputRef);

    setTimeout(() => {
      setEditingBadge({
        conditionIndex: 0,
        field: 'value',
        value: `${firstCond.value}-`,
      });
    }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);

    return;
  }

  if (joinOp && secondCond?.operator) {
    const secondCondCol = secondCond.field;
    const isMultiColumn = preserved.isMultiColumn && secondCondCol;

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
      !!isMultiColumn,
      columnName,
      { confirmed: true }
    );
  } else if (firstCond?.value && firstCond.value.trim() !== '') {
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
export function handleOperatorSelectSecond(
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

  const conditionColumn1 = getColumnAt(searchMode, 1);
  const conditionCol1Field = conditionColumn1?.field;
  const isMultiColumn =
    isBuildingConditionN(searchMode) && !!conditionCol1Field;

  if (firstValTo) {
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
export function handleOperatorSelectNormal(
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
