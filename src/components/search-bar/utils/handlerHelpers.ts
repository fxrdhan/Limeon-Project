/**
 * Handler Helper Utilities
 *
 * Common operations used across all badge clear/edit handlers.
 * Eliminates duplication and provides consistent behavior.
 */

import { RefObject } from 'react';
import { EnhancedSearchState, FilterSearch } from '../types';
import { SEARCH_CONSTANTS } from '../constants';

/**
 * Preserved filter state for edit operations
 */
export interface PreservedFilter {
  columnName?: string;
  operator: string;
  value: string;
  valueTo?: string; // For Between (inRange) operator - second value
  join?: 'AND' | 'OR';
  secondOperator?: string;
  secondValue?: string;
  secondValueTo?: string; // For second Between in multi-condition
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
  onChange({
    target: { value: newValue },
  } as React.ChangeEvent<HTMLInputElement>);

  if (options.focus && inputRef?.current) {
    setTimeout(() => {
      const input = inputRef.current;
      if (input) {
        input.focus();

        if (options.cursorAtEnd) {
          // Position cursor at end of input
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }
    }, SEARCH_CONSTANTS.INPUT_FOCUS_DELAY);
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
    const secondCondition = filter.conditions[1];

    return {
      operator: firstCondition.operator,
      value: firstCondition.value,
      valueTo: firstCondition.valueTo, // Preserve valueTo for Between
      join: filter.joinOperator,
      secondOperator: secondCondition.operator,
      secondValue: secondCondition.value,
      secondValueTo: secondCondition.valueTo, // Preserve second valueTo for Between
    };
  }

  // Partial multi-condition (has join and second operator but no second value)
  if (searchMode.partialJoin && searchMode.secondOperator && filter.value) {
    return {
      operator: filter.operator,
      value: filter.value,
      valueTo: filter.valueTo, // Preserve valueTo for Between
      join: searchMode.partialJoin,
      secondOperator: searchMode.secondOperator,
      secondValue: '',
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
 * Extract second condition from filter
 *
 * @param filter - Filter search object
 * @param searchMode - Current search state
 * @returns Second condition or undefined
 */
export function getSecondCondition(
  filter: FilterSearch,
  searchMode?: EnhancedSearchState
): { operator: string; value: string } | undefined {
  // From confirmed multi-condition
  if (filter.isMultiCondition && filter.conditions && filter.conditions[1]) {
    return filter.conditions[1];
  }

  // From partial multi-condition state
  if (searchMode?.secondOperator) {
    return {
      operator: searchMode.secondOperator,
      value: '', // No value yet in partial state
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
 * Extract second operator from various sources
 *
 * @param filter - Filter search object
 * @param searchMode - Current search state
 * @param valuePattern - Current value string to parse
 * @returns Second operator value or undefined
 */
export function getSecondOperatorValue(
  filter: FilterSearch,
  searchMode: EnhancedSearchState | undefined,
  valuePattern?: string
): string | undefined {
  // From confirmed multi-condition
  const secondCondition = getSecondCondition(filter, searchMode);
  if (secondCondition) {
    return secondCondition.operator;
  }

  // Extract from value pattern as fallback
  if (valuePattern) {
    const secondOpMatch = valuePattern.match(/#(and|or)\s+#([^\s]+)/i);
    if (secondOpMatch) {
      return secondOpMatch[2];
    }
  }

  return undefined;
}
