/**
 * Handler Helper Utilities
 *
 * Common operations used across all badge clear/edit handlers.
 * Eliminates duplication and provides consistent behavior.
 */

import { RefObject } from 'react';
import { EnhancedSearchState, FilterSearch } from '../types';

/**
 * Preserved condition data for N-condition support
 */
export interface PreservedCondition {
  field?: string; // Column field name
  operator?: string; // Operator value
  value?: string; // Primary value
  valueTo?: string; // Secondary value for Between operator
}

/**
 * Preserved filter state for edit operations
 * Supports unlimited N conditions through array-based structure
 */
export interface PreservedFilter {
  /** Array of preserved conditions (index 0 = first condition) */
  conditions: PreservedCondition[];
  /** Array of join operators (joins[0] = between condition 0 and 1) */
  joins: ('AND' | 'OR')[];
  /** Index of condition being edited */
  editingIndex?: number;
  /** Flag indicating multi-column filter (different columns per condition) */
  isMultiColumn?: boolean;
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
 * Supports N conditions through array-based structure
 *
 * Populates both new (conditions[], joins[]) and legacy fields for backward compatibility
 *
 * @param searchMode - Current search state
 * @returns Preserved filter object or null
 */
export function extractMultiConditionPreservation(
  searchMode: EnhancedSearchState
): PreservedFilter | null {
  const filter = searchMode.filterSearch;
  if (!filter) return null;

  const conditions: PreservedCondition[] = [];
  const joins: ('AND' | 'OR')[] = [];

  // Multi-condition filter with confirmed conditions
  if (
    filter.isMultiCondition &&
    filter.conditions &&
    filter.conditions.length >= 1
  ) {
    // Extract all conditions from confirmed filter
    filter.conditions.forEach((cond, index) => {
      conditions.push({
        field: cond.field || filter.field,
        operator: cond.operator,
        value: cond.value,
        valueTo: cond.valueTo,
      });

      // Add join operator between conditions (N-1 joins for N conditions)
      if (index < filter.conditions!.length - 1) {
        const joinAtIndex =
          filter.joins?.[index] || filter.joinOperator || 'AND';
        joins.push(joinAtIndex);
      }
    });

    // [FIX] CHECK FOR PARTIAL CONDITIONS BEYOND CONFIRMED ONES
    // This handles cases like 3+ conditions where the last one is being edited/typed
    const partialConditions = searchMode.partialConditions || [];
    if (partialConditions.length > filter.conditions.length) {
      // Add missing join that connects confirmed to partial
      const lastConfirmedIdx = filter.conditions.length - 1;
      const nextJoin =
        searchMode.joins?.[lastConfirmedIdx] || searchMode.partialJoin || 'AND';
      joins.push(nextJoin);

      // Add remaining partial conditions
      for (
        let i = filter.conditions.length;
        i < partialConditions.length;
        i++
      ) {
        const partial = partialConditions[i];
        if (partial.operator) {
          conditions.push({
            field: partial.field,
            operator: partial.operator,
            value: partial.value,
            valueTo: partial.valueTo,
          });

          // Add join if there's another condition after this
          if (i < partialConditions.length - 1) {
            const moreJoin =
              searchMode.joins?.[i] || searchMode.partialJoin || 'AND';
            joins.push(moreJoin);
          }
        }
      }
    }

    // Re-evaluate isMultiColumn to include partial conditions
    const hasAnyMultiColumn = conditions.some(
      (c, i) => i > 0 && c.field !== conditions[0].field
    );

    return {
      conditions,
      joins,
      isMultiColumn: filter.isMultiColumn || hasAnyMultiColumn,
    };
  }

  // Build conditions from partial state + first condition
  // First condition: from filter itself
  conditions.push({
    field: filter.field,
    operator: filter.operator,
    value: filter.value,
    valueTo: filter.valueTo,
  });

  // Check for partial conditions being built
  const partialConditions = searchMode.partialConditions || [];

  // Add partial join if exists
  if (searchMode.partialJoin) {
    joins.push(searchMode.partialJoin);

    // Add partial condition[N] if exists
    for (let i = 1; i < partialConditions.length + 1; i++) {
      const partialCond = partialConditions[i];
      if (partialCond) {
        conditions.push({
          field: partialCond.field,
          operator: partialCond.operator,
          value: partialCond.value,
          valueTo: partialCond.valueTo,
        });

        // Add join for next condition if more partials exist
        if (i < partialConditions.length && partialConditions[i + 1]) {
          // Use joins array if available, otherwise fallback to partialJoin
          const joinAtIndex = searchMode.joins?.[i] || searchMode.partialJoin;
          joins.push(joinAtIndex);
        }
      }
    }

    const hasMultiColumn = partialConditions.some(p => p?.column !== undefined);

    return {
      conditions,
      joins,
      isMultiColumn: hasMultiColumn,
    };
  }

  // Single condition only
  if (filter.operator) {
    return {
      conditions,
      joins: [],
      isMultiColumn: false,
    };
  }

  return null;
}

/**
 * Extract first condition from filter (convenience wrapper)
 *
 * @param filter - Filter search object
 * @returns First condition or fallback to filter's operator/value
 */
export function getFirstCondition(filter: FilterSearch): {
  operator: string;
  value: string;
  valueTo?: string;
  field?: string;
} {
  return (
    getConditionAt(filter, undefined, 0) || {
      operator: filter.operator,
      value: filter.value,
      valueTo: filter.valueTo,
      field: filter.field,
    }
  );
}

/**
 * Extract condition at specific index (scalable N-condition support)
 *
 * @param filter - Filter search object
 * @param searchMode - Current search state
 * @param index - Condition index (0 = first, 1 = second, etc.)
 * @returns Condition at index or undefined
 */
export function getConditionAt(
  filter: FilterSearch,
  searchMode?: EnhancedSearchState,
  index: number = 0
):
  | { operator: string; value: string; valueTo?: string; field?: string }
  | undefined {
  // From confirmed multi-condition
  if (
    filter.isMultiCondition &&
    filter.conditions &&
    filter.conditions[index]
  ) {
    const cond = filter.conditions[index];
    return {
      operator: cond.operator,
      value: cond.value,
      valueTo: cond.valueTo,
      field: cond.field || filter.field,
    };
  }

  // Index 0: fallback to filter itself
  if (index === 0) {
    return {
      operator: filter.operator,
      value: filter.value,
      valueTo: filter.valueTo,
      field: filter.field,
    };
  }

  // From partial multi-condition state
  const partialCond = searchMode?.partialConditions?.[index];
  if (partialCond?.operator) {
    return {
      operator: partialCond.operator,
      value: partialCond.value ?? '',
      valueTo: partialCond.valueTo,
      field: partialCond.field,
    };
  }

  return undefined;
}

/**
 * Get join operator from filter (convenience wrapper for first join)
 *
 * @param filter - Filter search object
 * @param searchMode - Current search state
 * @returns Join operator or undefined
 */
export function getJoinOperator(
  filter: FilterSearch,
  searchMode?: EnhancedSearchState
): 'AND' | 'OR' | undefined {
  // Delegate to getJoinAt for index 0
  return getJoinAt(filter, searchMode, 0);
}

/**
 * Get join operator at specific index (scalable N-condition support)
 *
 * @param filter - Filter search object
 * @param searchMode - Current search state
 * @param index - Join index (0 = between condition 0 and 1)
 * @returns Join operator or undefined
 */
export function getJoinAt(
  filter: FilterSearch,
  searchMode?: EnhancedSearchState,
  index: number = 0
): 'AND' | 'OR' | undefined {
  // First, check searchMode.joins array (scalable N-join support)
  if (searchMode?.joins?.[index]) {
    return searchMode.joins[index];
  }

  // For index 0, also check legacy sources
  if (index === 0) {
    // From confirmed multi-condition filter
    if (filter.joinOperator) {
      return filter.joinOperator;
    }
    // From partial join state (building second condition)
    if (searchMode?.partialJoin) {
      return searchMode.partialJoin;
    }
  }

  return undefined;
}

/**
 * Extract condition operator at specific index from various sources
 *
 * @param filter - Filter search object
 * @param searchMode - Current search state
 * @param index - Condition index
 * @param valuePattern - Current value string to parse (fallback)
 * @returns Condition operator value or undefined
 */
export function getConditionOperatorAt(
  filter: FilterSearch,
  searchMode: EnhancedSearchState | undefined,
  index: number,
  valuePattern?: string
): string | undefined {
  // From confirmed/partial condition
  const condition = getConditionAt(filter, searchMode, index);
  if (condition) {
    return condition.operator;
  }

  // Extract from value pattern as fallback (for index 1 only - legacy support)
  if (index === 1 && valuePattern) {
    const condOpMatch = valuePattern.match(/#(and|or)\s+#([^\s]+)/i);
    if (condOpMatch) {
      return condOpMatch[2];
    }
  }

  return undefined;
}
