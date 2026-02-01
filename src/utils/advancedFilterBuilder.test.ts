import { describe, it, expect } from 'vitest';
import {
  buildAdvancedFilterModel,
  clearAdvancedFilter,
} from './advancedFilterBuilder';
import type { FilterSearch } from '@/types/search';

const textColumn = {
  field: 'name',
  headerName: 'Name',
  searchable: true,
  type: 'text' as const,
};

const numberColumn = {
  field: 'stock',
  headerName: 'Stock',
  searchable: true,
  type: 'number' as const,
};

describe('advancedFilterBuilder', () => {
  it('returns null when no filter search', () => {
    expect(buildAdvancedFilterModel(null)).toBeNull();
    expect(clearAdvancedFilter()).toBeNull();
  });

  it('builds a group filter model', () => {
    const filterSearch: FilterSearch = {
      field: 'name',
      value: 'Alpha',
      operator: 'contains',
      column: textColumn,
      filterGroup: {
        kind: 'group',
        join: 'OR',
        nodes: [
          {
            kind: 'condition',
            operator: 'contains',
            value: 'Alpha',
            field: 'name',
            column: textColumn,
          },
          {
            kind: 'condition',
            operator: 'equals',
            value: 'Beta',
            field: 'name',
            column: textColumn,
          },
        ],
      },
    };

    const result = buildAdvancedFilterModel(filterSearch) as {
      filterType: string;
      type: string;
      conditions: unknown[];
    };

    expect(result.type).toBe('OR');
    expect(result.conditions).toHaveLength(2);
  });

  it('supports nested filter groups', () => {
    const filterSearch: FilterSearch = {
      field: 'name',
      value: 'Alpha',
      operator: 'contains',
      filterGroup: {
        kind: 'group',
        join: 'AND',
        nodes: [
          {
            kind: 'group',
            join: 'OR',
            nodes: [
              {
                kind: 'condition',
                operator: 'contains',
                value: 'Alpha',
                field: 'name',
              },
            ],
          },
          {
            kind: 'condition',
            operator: 'equals',
            value: 'Beta',
            field: 'name',
          },
        ],
      },
    } as FilterSearch;

    const result = buildAdvancedFilterModel(filterSearch) as {
      filterType: string;
      type: string;
      conditions: unknown[];
    };

    expect(result.type).toBe('AND');
    expect(result.conditions).toHaveLength(2);
  });

  it('uses field name heuristics without column metadata', () => {
    const filterSearch: FilterSearch = {
      field: 'stock',
      value: '5',
      operator: 'greaterThan',
      column: undefined,
    } as FilterSearch;

    const result = buildAdvancedFilterModel(filterSearch) as {
      filterType: string;
    };
    expect(result.filterType).toBe('number');
  });

  it('builds multi-condition filters with numbers', () => {
    const filterSearch: FilterSearch = {
      field: 'stock',
      value: '5',
      operator: 'greaterThan',
      column: numberColumn,
      isMultiCondition: true,
      joinOperator: 'AND',
      conditions: [
        {
          operator: 'greaterThan',
          value: '5',
          field: 'stock',
          column: numberColumn,
        },
        {
          operator: 'lessThan',
          value: '10',
          field: 'stock',
          column: numberColumn,
        },
      ],
    };

    const result = buildAdvancedFilterModel(filterSearch) as {
      type: string;
      conditions: Array<{ filter: number }>;
    };

    expect(result.type).toBe('AND');
    expect(result.conditions[0].filter).toBe(5);
    expect(result.conditions[1].filter).toBe(10);
  });

  it('defaults join operator when not provided', () => {
    const filterSearch: FilterSearch = {
      field: 'stock',
      value: '5',
      operator: 'greaterThan',
      column: numberColumn,
      isMultiCondition: true,
      conditions: [
        {
          operator: 'greaterThan',
          value: '5',
          field: 'stock',
          column: numberColumn,
        },
        {
          operator: 'lessThan',
          value: '10',
          field: 'stock',
          column: numberColumn,
        },
      ],
    };

    const result = buildAdvancedFilterModel(filterSearch) as {
      type: string;
    };

    expect(result.type).toBe('AND');
  });

  it('returns a single condition when only one is provided', () => {
    const filterSearch: FilterSearch = {
      field: 'date',
      value: '2024-01-01',
      operator: 'equals',
      isMultiCondition: true,
      joinOperator: 'AND',
      conditions: [
        {
          operator: 'equals',
          value: '2024-01-01',
          field: 'date',
        },
      ],
    } as FilterSearch;

    const result = buildAdvancedFilterModel(filterSearch) as {
      filterType: string;
    };
    expect(result.filterType).toBe('date');
  });

  it('returns single group condition directly', () => {
    const filterSearch: FilterSearch = {
      field: 'name',
      value: 'Alpha',
      operator: 'contains',
      filterGroup: {
        kind: 'group',
        join: 'AND',
        nodes: [
          {
            kind: 'condition',
            operator: 'contains',
            value: 'Alpha',
            field: 'name',
          },
        ],
      },
    } as FilterSearch;

    const result = buildAdvancedFilterModel(filterSearch) as {
      filterType: string;
    };
    expect(result.filterType).toBe('text');
  });

  it('builds inRange condition with joins', () => {
    const filterSearch: FilterSearch = {
      field: 'created_at',
      value: '2024-01-01',
      valueTo: '2024-01-31',
      operator: 'inRange',
      column: {
        field: 'created_at',
        headerName: 'Created',
        searchable: true,
        type: 'date',
      },
    };

    const result = buildAdvancedFilterModel(filterSearch) as {
      filterType: string;
      type: string;
      conditions: Array<{ type: string; filter: string }>;
    };

    expect(result.filterType).toBe('join');
    expect(result.type).toBe('AND');
    expect(result.conditions[0].type).toBe('greaterThanOrEqual');
    expect(result.conditions[1].filter).toBe('2024-01-31');
  });

  it('builds numeric inRange condition with number conversion', () => {
    const filterSearch: FilterSearch = {
      field: 'stock',
      value: '1',
      valueTo: '5',
      operator: 'inRange',
      column: numberColumn,
    };

    const result = buildAdvancedFilterModel(filterSearch) as {
      conditions: Array<{ filter: number }>;
    };

    expect(result.conditions[0].filter).toBe(1);
    expect(result.conditions[1].filter).toBe(5);
  });

  it('uses default field when condition field missing', () => {
    const filterSearch: FilterSearch = {
      field: 'name',
      value: 'Alpha',
      operator: 'contains',
      isMultiCondition: true,
      conditions: [
        {
          operator: 'contains',
          value: 'Alpha',
          field: undefined,
        },
      ],
    } as FilterSearch;

    const result = buildAdvancedFilterModel(filterSearch) as {
      colId?: string;
    };

    expect(result.colId).toBe('name');
  });
});
