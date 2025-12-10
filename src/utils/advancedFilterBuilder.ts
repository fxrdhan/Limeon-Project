import type {
  FilterSearch,
  FilterCondition,
  SearchColumn,
} from '@/types/search';
import type { AdvancedFilterModel } from 'ag-grid-community';

/**
 * Map of column fields to their filter types
 * This determines how the Advanced Filter will handle each column
 */
const NUMERIC_COLUMNS = [
  'stock',
  'base_price',
  'sell_price',
  'price',
  'quantity',
  'amount',
];
const DATE_COLUMNS = [
  'created_at',
  'updated_at',
  'date',
  'birth_date',
  'expiry_date',
];

/**
 * Determine the filter type for a column based on its field name or column definition
 */
function getFilterType(
  field: string,
  column?: SearchColumn
): 'text' | 'number' | 'date' {
  // Check column type first if available
  if (column?.type) {
    if (column.type === 'number' || column.type === 'currency') return 'number';
    if (column.type === 'date') return 'date';
    return 'text';
  }

  // Fall back to field name matching
  if (NUMERIC_COLUMNS.some(col => field.includes(col))) return 'number';
  if (DATE_COLUMNS.some(col => field.includes(col))) return 'date';
  return 'text';
}

/**
 * Convert a single FilterCondition to an AdvancedFilterModel column condition
 */
function buildColumnCondition(
  condition: FilterCondition,
  defaultField: string,
  defaultColumn?: SearchColumn
): AdvancedFilterModel {
  const field = condition.field || defaultField;
  const filterType = getFilterType(field, condition.column || defaultColumn);

  // Handle inRange (Between) operator specially
  if (condition.operator === 'inRange' && condition.valueTo) {
    // For number/date range, use greaterThanOrEqual AND lessThanOrEqual
    return {
      filterType: 'join',
      type: 'AND',
      conditions: [
        {
          filterType,
          colId: field,
          type: 'greaterThanOrEqual',
          filter:
            filterType === 'number' ? Number(condition.value) : condition.value,
        },
        {
          filterType,
          colId: field,
          type: 'lessThanOrEqual',
          filter:
            filterType === 'number'
              ? Number(condition.valueTo)
              : condition.valueTo,
        },
      ],
    } as AdvancedFilterModel;
  }

  // Standard condition
  const baseCondition: AdvancedFilterModel = {
    filterType,
    colId: field,
    type: condition.operator,
    filter: filterType === 'number' ? Number(condition.value) : condition.value,
  } as AdvancedFilterModel;

  return baseCondition;
}

/**
 * Build nested filter structure for N conditions with mixed join operators
 * Uses left-to-right evaluation (no operator precedence)
 *
 * Example with 3 conditions: A AND B OR C
 * Builds: OR(AND(A, B), C)
 */
function buildNestedJoinModel(
  conditions: AdvancedFilterModel[],
  joinOperators: ('AND' | 'OR')[]
): AdvancedFilterModel {
  if (conditions.length === 1) {
    return conditions[0];
  }

  if (conditions.length === 2) {
    return {
      filterType: 'join',
      type: joinOperators[0] || 'AND',
      conditions: [conditions[0], conditions[1]],
    } as AdvancedFilterModel;
  }

  // For N > 2 conditions, build left-to-right
  // Start with first two conditions
  let result: AdvancedFilterModel = {
    filterType: 'join',
    type: joinOperators[0] || 'AND',
    conditions: [conditions[0], conditions[1]],
  } as AdvancedFilterModel;

  // Add remaining conditions left-to-right
  for (let i = 2; i < conditions.length; i++) {
    const joinType = joinOperators[i - 1] || 'AND';
    result = {
      filterType: 'join',
      type: joinType,
      conditions: [result, conditions[i]],
    } as AdvancedFilterModel;
  }

  return result;
}

/**
 * Build an AdvancedFilterModel from a FilterSearch object
 *
 * This converts our badge-based filter representation to AG Grid's Advanced Filter format.
 * Key benefit: Advanced Filter supports OR operations across different columns.
 * Supports N conditions (up to MAX_FILTER_CONDITIONS) with mixed AND/OR operators.
 */
export function buildAdvancedFilterModel(
  filterSearch: FilterSearch | null
): AdvancedFilterModel | null {
  if (!filterSearch) return null;

  // Multi-condition filter (AND/OR between conditions)
  if (
    filterSearch.isMultiCondition &&
    filterSearch.conditions &&
    filterSearch.conditions.length > 0
  ) {
    // Build conditions array
    const conditions = filterSearch.conditions.map(cond =>
      buildColumnCondition(cond, filterSearch.field, filterSearch.column)
    );

    // If only one condition after processing, return it directly
    if (conditions.length === 1) {
      return conditions[0];
    }

    // Get join operators array, falling back to legacy single joinOperator
    const joinOps =
      filterSearch.joinOperators ||
      (filterSearch.joinOperator ? [filterSearch.joinOperator] : ['AND']);

    // Check if all join operators are the same
    const allSameJoin = joinOps.every(op => op === joinOps[0]);

    if (allSameJoin) {
      // Simple case: all same join type - flat structure
      return {
        filterType: 'join',
        type: joinOps[0],
        conditions,
      } as AdvancedFilterModel;
    }

    // Mixed operators: build nested structure with left-to-right evaluation
    return buildNestedJoinModel(conditions, joinOps);
  }

  // Single condition filter
  const singleCondition: FilterCondition = {
    operator: filterSearch.operator,
    value: filterSearch.value,
    valueTo: filterSearch.valueTo,
    field: filterSearch.field,
    column: filterSearch.column,
  };

  return buildColumnCondition(
    singleCondition,
    filterSearch.field,
    filterSearch.column
  );
}

/**
 * Clear the Advanced Filter
 */
export function clearAdvancedFilter(): null {
  return null;
}
