import type {
  FilterSearch,
  FilterCondition,
  FilterGroup,
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

function buildGroupCondition(
  group: FilterGroup,
  defaultField: string,
  defaultColumn?: SearchColumn
): AdvancedFilterModel {
  const conditions = group.nodes.map(node => {
    if (node.kind === 'group') {
      return buildGroupCondition(node, defaultField, defaultColumn);
    }
    return buildColumnCondition(node, defaultField, defaultColumn);
  });

  if (conditions.length === 1) {
    return conditions[0];
  }

  return {
    filterType: 'join',
    type: group.join,
    conditions,
  } as AdvancedFilterModel;
}

/**
 * Build an AdvancedFilterModel from a FilterSearch object
 *
 * This converts our badge-based filter representation to AG Grid's Advanced Filter format.
 * Key benefit: Advanced Filter supports OR operations across different columns.
 */
export function buildAdvancedFilterModel(
  filterSearch: FilterSearch | null
): AdvancedFilterModel | null {
  if (!filterSearch) return null;

  if (filterSearch.filterGroup) {
    return buildGroupCondition(
      filterSearch.filterGroup,
      filterSearch.field,
      filterSearch.column
    );
  }

  // Multi-condition filter (AND/OR between conditions)
  if (
    filterSearch.isMultiCondition &&
    filterSearch.conditions &&
    filterSearch.conditions.length > 0
  ) {
    const joinType = filterSearch.joinOperator || 'AND';

    // Build conditions array
    const conditions = filterSearch.conditions.map(cond =>
      buildColumnCondition(cond, filterSearch.field, filterSearch.column)
    );

    // If only one condition after processing, return it directly
    if (conditions.length === 1) {
      return conditions[0];
    }

    // Return join model
    return {
      filterType: 'join',
      type: joinType,
      conditions,
    } as AdvancedFilterModel;
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
