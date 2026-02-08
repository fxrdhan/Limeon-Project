import { describe, expect, it } from 'vitest';
import type { FilterGroup, FilterSearch, SearchColumn } from '../types';
import { isFilterSearchValid, validateFilterValue } from './validationUtils';

const textColumn: SearchColumn = {
  field: 'name',
  headerName: 'Nama',
  type: 'text',
  searchable: true,
};

const numberColumn: SearchColumn = {
  field: 'stock',
  headerName: 'Stok',
  type: 'number',
  searchable: true,
};

const currencyColumn: SearchColumn = {
  field: 'price',
  headerName: 'Harga',
  type: 'currency',
  searchable: true,
};

describe('validationUtils', () => {
  it('validates single filter value by type', () => {
    expect(validateFilterValue(undefined, 'text')).toBe(false);
    expect(validateFilterValue('   ', 'text')).toBe(false);

    expect(validateFilterValue('abc', 'number')).toBe(false);
    expect(validateFilterValue('Rp 12abc', 'currency')).toBe(false);
    expect(validateFilterValue('Rp 12.000,50', 'currency')).toBe(true);
    expect(validateFilterValue('12,000', 'number')).toBe(true);

    expect(validateFilterValue('anything', 'text')).toBe(true);
    expect(validateFilterValue('2026-02-08', 'date')).toBe(true);
  });

  it('validates single-condition filter including inRange', () => {
    const validSingle: FilterSearch = {
      field: 'name',
      value: 'Aspirin',
      column: textColumn,
      operator: 'contains',
      isExplicitOperator: true,
    };
    expect(isFilterSearchValid(validSingle)).toBe(true);

    const invalidSingle: FilterSearch = {
      ...validSingle,
      value: '',
    };
    expect(isFilterSearchValid(invalidSingle)).toBe(false);

    const validRange: FilterSearch = {
      field: 'stock',
      value: '10',
      valueTo: '20',
      column: numberColumn,
      operator: 'inRange',
      isExplicitOperator: true,
    };
    expect(isFilterSearchValid(validRange)).toBe(true);

    const invalidRange: FilterSearch = {
      ...validRange,
      valueTo: 'two puluh',
    };
    expect(isFilterSearchValid(invalidRange)).toBe(false);
  });

  it('validates multi-condition filters and column fallback type', () => {
    const validMulti: FilterSearch = {
      field: 'price',
      value: '1000',
      column: currencyColumn,
      operator: 'contains',
      isExplicitOperator: true,
      isMultiCondition: true,
      conditions: [
        {
          field: 'price',
          column: currencyColumn,
          operator: 'equals',
          value: 'Rp 1000',
        },
        {
          field: 'stock',
          operator: 'inRange',
          value: '10',
          valueTo: '20',
          column: numberColumn,
        },
      ],
    };

    expect(isFilterSearchValid(validMulti)).toBe(true);

    const invalidFallbackType: FilterSearch = {
      ...validMulti,
      conditions: [
        {
          field: 'price',
          operator: 'equals',
          value: 'invalid',
        },
      ],
    };

    expect(isFilterSearchValid(invalidFallbackType)).toBe(false);
  });

  it('validates nested filter groups recursively', () => {
    const group: FilterGroup = {
      kind: 'group',
      join: 'AND',
      nodes: [
        {
          kind: 'condition',
          field: 'name',
          operator: 'contains',
          value: 'Paracetamol',
          column: textColumn,
        },
        {
          kind: 'group',
          join: 'OR',
          nodes: [
            {
              kind: 'condition',
              field: 'price',
              operator: 'inRange',
              value: '1000',
              valueTo: '2000',
              column: currencyColumn,
            },
          ],
        },
      ],
    };

    const filter: FilterSearch = {
      field: 'name',
      value: 'Paracetamol',
      column: textColumn,
      operator: 'contains',
      isExplicitOperator: true,
      filterGroup: group,
    };

    expect(isFilterSearchValid(filter)).toBe(true);

    const invalidFilter: FilterSearch = {
      ...filter,
      filterGroup: {
        ...group,
        nodes: [
          {
            kind: 'condition',
            field: 'price',
            operator: 'inRange',
            value: '1000',
            valueTo: 'invalid-range',
            column: currencyColumn,
          },
        ],
      },
    };

    expect(isFilterSearchValid(invalidFilter)).toBe(false);
    expect(isFilterSearchValid(null)).toBe(false);
    expect(isFilterSearchValid(undefined)).toBe(false);
  });
});
