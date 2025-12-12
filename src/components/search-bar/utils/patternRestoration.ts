/**
 * Pattern Restoration Utility
 *
 * Consolidates the duplicated pattern restoration logic that appears 6+ times
 * in EnhancedSearchBar.tsx. Provides a single source of truth for rebuilding
 * search patterns from FilterSearch/EnhancedSearchState.
 *
 * This eliminates ~300+ lines of duplicated code.
 */

import { FilterSearch, FilterCondition, EnhancedSearchState } from '../types';

/**
 * Build the pattern string for a single condition
 *
 * @param field - Column field name
 * @param operator - Operator value
 * @param value - Primary value
 * @param valueTo - Secondary value for Between operator
 * @returns Pattern string for the condition (without field prefix for same-column)
 */
export function buildConditionPart(
  field: string,
  operator: string,
  value: string,
  valueTo?: string
): string {
  if (operator === 'inRange' && valueTo) {
    return `#${field} #${operator} ${value} #to ${valueTo}`;
  }
  return `#${field} #${operator} ${value}`;
}

/**
 * Build condition part for same-column multi-condition (no field prefix)
 *
 * @param operator - Operator value
 * @param value - Primary value
 * @param valueTo - Secondary value for Between operator
 * @returns Pattern string for the condition (operator + value only)
 */
export function buildConditionPartNoField(
  operator: string,
  value: string,
  valueTo?: string
): string {
  if (operator === 'inRange' && valueTo) {
    return `#${operator} ${value} #to ${valueTo}`;
  }
  return `#${operator} ${value}`;
}

/**
 * Restore a confirmed filter pattern from FilterSearch
 *
 * This is the main function that replaces duplicated pattern restoration logic.
 * It handles all cases:
 * - Single condition
 * - Multi-condition same-column
 * - Multi-condition multi-column
 * - Between operator with valueTo
 *
 * @param filter - The FilterSearch object containing filter data
 * @returns The restored pattern string with ## confirmation marker
 */
export function restoreConfirmedPattern(filter: FilterSearch): string {
  const columnName = filter.field;

  // Multi-condition filter
  if (
    filter.isMultiCondition &&
    filter.conditions &&
    filter.conditions.length >= 2
  ) {
    return restoreMultiConditionPattern(filter, columnName);
  }

  // Single condition filter
  return restoreSingleConditionPattern(filter, columnName);
}

/**
 * Restore a single-condition confirmed pattern
 *
 * @param filter - The FilterSearch object
 * @param columnName - The column field name
 * @returns Pattern string with ## marker
 */
function restoreSingleConditionPattern(
  filter: FilterSearch,
  columnName: string
): string {
  if (filter.valueTo) {
    // Between operator with valueTo
    return `#${columnName} #${filter.operator} ${filter.value} #to ${filter.valueTo}##`;
  }
  return `#${columnName} #${filter.operator} ${filter.value}##`;
}

/**
 * Restore a multi-condition confirmed pattern
 * UNIFIED N-CONDITION: Use buildNConditionsPattern for ALL multi-condition cases
 *
 * @param filter - The FilterSearch object with conditions array
 * @param columnName - The primary column field name
 * @returns Pattern string with ## marker
 */
function restoreMultiConditionPattern(
  filter: FilterSearch,
  columnName: string
): string {
  const conditions = filter.conditions!;

  // Build joins array from filter.joins or use joinOperator as fallback
  const joins: ('AND' | 'OR')[] =
    filter.joins ||
    Array(conditions.length - 1).fill(filter.joinOperator || 'AND');

  return buildNConditionsPattern(
    conditions,
    joins,
    filter.isMultiColumn || false,
    columnName,
    true // confirmed
  );
}

/**
 * Restore pattern from EnhancedSearchState (uses filterSearch + preserved state)
 *
 * @param searchMode - The EnhancedSearchState
 * @returns The restored pattern string or null if no filter
 */
export function restorePatternFromState(
  searchMode: EnhancedSearchState
): string | null {
  if (!searchMode.filterSearch) {
    return null;
  }

  return restoreConfirmedPattern(searchMode.filterSearch);
}

/**
 * Build a partial pattern (for edit mode, without ## marker)
 *
 * @param filter - The FilterSearch object
 * @param options - Options for pattern building
 * @returns Pattern string without ## marker
 */
export function buildPartialPattern(
  filter: FilterSearch,
  options?: {
    /** Stop after first condition (for editing first value) */
    firstConditionOnly?: boolean;
    /** Include trailing space + # for selector */
    openSelector?: 'column' | 'operator' | 'join';
    /** For multi-condition: build up to condition at this index */
    upToConditionIndex?: number;
  }
): string {
  const columnName = filter.field;
  const { firstConditionOnly, openSelector, upToConditionIndex } =
    options || {};

  // Single condition or firstConditionOnly
  if (!filter.isMultiCondition || firstConditionOnly) {
    let pattern = buildConditionPart(
      columnName,
      filter.operator,
      filter.value,
      filter.valueTo
    );

    if (openSelector === 'join') {
      pattern += ' #';
    } else if (openSelector === 'operator') {
      pattern = `#${columnName} #`;
    } else if (openSelector === 'column') {
      pattern = '#';
    }

    return pattern;
  }

  // Multi-condition
  if (filter.conditions && filter.conditions.length >= 2) {
    const maxIndex = upToConditionIndex ?? filter.conditions.length - 1;
    const join = filter.joinOperator || 'AND';
    let pattern = '';

    for (let i = 0; i <= maxIndex && i < filter.conditions.length; i++) {
      const cond = filter.conditions[i];
      const condField = cond.field || columnName;

      if (i === 0) {
        // First condition always with field
        pattern = buildConditionPart(
          condField,
          cond.operator,
          cond.value,
          cond.valueTo
        );
      } else {
        // Subsequent conditions
        pattern += ` #${join.toLowerCase()} `;

        if (filter.isMultiColumn) {
          // Multi-column: include field for each condition
          pattern += buildConditionPart(
            condField,
            cond.operator,
            cond.value,
            cond.valueTo
          );
        } else {
          // Same-column: no field for subsequent conditions
          pattern += buildConditionPartNoField(
            cond.operator,
            cond.value,
            cond.valueTo
          );
        }
      }
    }

    if (openSelector) {
      pattern += ' #';
    }

    return pattern;
  }

  return '';
}

/**
 * Build pattern for N conditions (scalable version)
 *
 * @param conditions - Array of FilterCondition
 * @param joins - Array of join operators
 * @param isMultiColumn - Whether each condition uses different column
 * @param defaultField - Default column field (for same-column filters)
 * @param confirmed - Whether to add ## confirmation marker
 * @returns The built pattern string
 */
export function buildNConditionsPattern(
  conditions: FilterCondition[],
  joins: ('AND' | 'OR')[],
  isMultiColumn: boolean,
  defaultField: string,
  confirmed: boolean = true
): string {
  if (conditions.length === 0) {
    return '';
  }

  let pattern = '';

  for (let i = 0; i < conditions.length; i++) {
    const cond = conditions[i];
    const condField = cond.field || defaultField;

    if (i === 0) {
      // First condition always includes field
      pattern = buildConditionPart(
        condField,
        cond.operator,
        cond.value,
        cond.valueTo
      );
    } else {
      // Add join operator
      const joinOp = joins[i - 1] || 'AND';
      pattern += ` #${joinOp.toLowerCase()} `;

      if (isMultiColumn) {
        // Multi-column: include field
        pattern += buildConditionPart(
          condField,
          cond.operator,
          cond.value,
          cond.valueTo
        );
      } else {
        // Same-column: no field
        pattern += buildConditionPartNoField(
          cond.operator,
          cond.value,
          cond.valueTo
        );
      }
    }
  }

  if (confirmed) {
    pattern += '##';
  }

  return pattern;
}
