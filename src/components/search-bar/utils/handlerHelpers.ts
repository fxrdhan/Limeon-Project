/**
 * Handler Helper Utilities
 *
 * Common operations used across all badge clear/edit handlers.
 * Eliminates duplication and provides consistent behavior.
 */

import { RefObject } from 'react';
import { EnhancedSearchState, FilterSearch } from '../types';

/**
 * Preserved filter state for edit operations
 */
export interface PreservedFilter {
  columnName?: string;
  operator: string;
  value: string;
  valueTo?: string; // For Between (inRange) operator - "to" value
  join?: 'AND' | 'OR';
  condition1Operator?: string; // Operator at condition index 1
  condition1Value?: string; // Value at condition index 1
  condition1ValueTo?: string; // "to" value for Between at condition index 1
  condition1Field?: string; // Column field for condition index 1
  wasMultiColumn?: boolean; // Track if original structure had explicit condition[1] column badge
}

/**
 * Options for setValue operation
 */
export interface SetValueOptions {
  focus?: boolean;
  cursorAtEnd?: boolean;
}

/**
 * Helper to set filter value with auto-focus
 *
 * Wraps the common pattern of:
 * 1. Calling onChange with new value
 * 2. setTimeout to focus input
 * 3. Optionally position cursor at end
 *
 * @param newValue - The new search value to set
 * @param onChange - The onChange handler
 * @param inputRef - Reference to input element
 * @param options - Focus and cursor options
 */
export function setFilterValue(
  newValue: string,
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
  inputRef: RefObject<HTMLInputElement | null> | null | undefined,
  options: SetValueOptions = { focus: true, cursorAtEnd: false }
): void {
  // Trigger the onChange to update React state
  onChange({
    target: { value: newValue },
  } as React.ChangeEvent<HTMLInputElement>);

  // Use double requestAnimationFrame to ensure DOM is fully ready after React render and browser paint
  if (options.focus && inputRef) {
    // First RAF: schedule after current frame (allows React to process state update)
    requestAnimationFrame(() => {
      // Second RAF: schedule after browser paint (ensures DOM is fully updated)
      requestAnimationFrame(() => {
        const input = inputRef.current;
        if (input) {
          input.focus();

          if (options.cursorAtEnd) {
            // Position cursor at end of input
            const cursorPosition = newValue.length;
            input.setSelectionRange(cursorPosition, cursorPosition);
          }
        }
      });
    });
  }
}

/**
 * Extract preserved filter data from multi-condition filter
 *
 * @param searchMode - Current search state
 * @returns Preserved filter object or null
 */
export function extractMultiConditionPreservation(
  searchMode: EnhancedSearchState
): PreservedFilter | null {
  const filter = searchMode.filterSearch;
  if (!filter) return null;

  // Multi-condition filter with both conditions
  if (
    filter.isMultiCondition &&
    filter.conditions &&
    filter.conditions.length >= 2
  ) {
    const firstCondition = filter.conditions[0];
    const condition1 = filter.conditions[1];

    return {
      operator: firstCondition.operator,
      value: firstCondition.value,
      valueTo: firstCondition.valueTo, // Preserve valueTo for Between
      join: filter.joinOperator,
      condition1Operator: condition1.operator,
      condition1Value: condition1.value,
      condition1ValueTo: condition1.valueTo, // Preserve condition[1] valueTo for Between
      condition1Field: condition1.field, // Preserve condition[1] column for multi-column
      wasMultiColumn: filter.isMultiColumn, // Track if original had explicit condition[1] column badge
    };
  }

  // Partial multi-condition (has join and condition[1] operator but no value)
  const condition1 = searchMode.partialConditions?.[1];
  if (searchMode.partialJoin && condition1?.operator && filter.value) {
    return {
      operator: filter.operator,
      value: filter.value,
      valueTo: filter.valueTo, // Preserve valueTo for Between
      join: searchMode.partialJoin,
      condition1Operator: condition1.operator,
      condition1Value: condition1.value ?? '',
      condition1Field: condition1.field, // Preserve condition[1] column for multi-column
      wasMultiColumn: !!condition1.column, // Has explicit condition[1] column = multi-column
    };
  }

  // Partial join with condition[1] column but no operator yet
  // This happens when operator selector for condition[1] column is open
  if (searchMode.partialJoin && condition1?.column && filter.value) {
    return {
      operator: filter.operator,
      value: filter.value,
      valueTo: filter.valueTo, // Preserve valueTo for Between
      join: searchMode.partialJoin,
      condition1Field: condition1.field, // Preserve condition[1] column!
      wasMultiColumn: true, // Has explicit condition[1] column = multi-column
      // No condition1Operator/condition1Value yet
    };
  }

  // Partial join only (has join but no condition[1] column yet)
  // This happens when column selector for condition[1] column is open
  if (searchMode.partialJoin && filter.value) {
    return {
      operator: filter.operator,
      value: filter.value,
      valueTo: filter.valueTo, // Preserve valueTo for Between
      join: searchMode.partialJoin,
      // No condition1Operator/condition1Value/condition1Field yet
    };
  }

  // Single condition with value
  if (filter.operator && filter.value) {
    return {
      operator: filter.operator,
      value: filter.value,
      valueTo: filter.valueTo, // Preserve valueTo for Between
    };
  }

  // Single condition without value (column + operator only)
  if (filter.operator) {
    return {
      operator: filter.operator,
      value: '',
    };
  }

  return null;
}

/**
 * Extract first condition from filter
 *
 * @param filter - Filter search object
 * @returns First condition or fallback to filter's operator/value
 */
export function getFirstCondition(filter: FilterSearch): {
  operator: string;
  value: string;
  valueTo?: string;
} {
  if (filter.isMultiCondition && filter.conditions && filter.conditions[0]) {
    return filter.conditions[0];
  }

  return {
    operator: filter.operator,
    value: filter.value,
    valueTo: filter.valueTo,
  };
}

/**
 * Extract condition[1] from filter
 *
 * @param filter - Filter search object
 * @param searchMode - Current search state
 * @returns Condition[1] or undefined
 */
export function getCondition1(
  filter: FilterSearch,
  searchMode?: EnhancedSearchState
): { operator: string; value: string } | undefined {
  // From confirmed multi-condition
  if (filter.isMultiCondition && filter.conditions && filter.conditions[1]) {
    return filter.conditions[1];
  }

  // From partial multi-condition state (using scalable partialConditions)
  const condition1Op = searchMode?.partialConditions?.[1]?.operator;
  if (condition1Op) {
    return {
      operator: condition1Op,
      value: searchMode?.partialConditions?.[1]?.value ?? '', // Value if available
    };
  }

  return undefined;
}

/**
 * Get join operator from filter
 *
 * @param filter - Filter search object
 * @param searchMode - Current search state
 * @returns Join operator or undefined
 */
export function getJoinOperator(
  filter: FilterSearch,
  searchMode?: EnhancedSearchState
): 'AND' | 'OR' | undefined {
  // From confirmed multi-condition
  if (filter.joinOperator) {
    return filter.joinOperator;
  }

  // From partial join state
  if (searchMode?.partialJoin) {
    return searchMode.partialJoin;
  }

  return undefined;
}

/**
 * Extract condition[1] operator from various sources
 *
 * @param filter - Filter search object
 * @param searchMode - Current search state
 * @param valuePattern - Current value string to parse
 * @returns Condition[1] operator value or undefined
 */
export function getCondition1OperatorValue(
  filter: FilterSearch,
  searchMode: EnhancedSearchState | undefined,
  valuePattern?: string
): string | undefined {
  // From confirmed multi-condition
  const condition1 = getCondition1(filter, searchMode);
  if (condition1) {
    return condition1.operator;
  }

  // Extract from value pattern as fallback
  if (valuePattern) {
    const cond1OpMatch = valuePattern.match(/#(and|or)\s+#([^\s]+)/i);
    if (cond1OpMatch) {
      return cond1OpMatch[2];
    }
  }

  return undefined;
}
