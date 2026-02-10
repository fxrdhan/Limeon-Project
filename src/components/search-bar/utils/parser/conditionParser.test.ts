import { describe, expect, it } from 'vitest';
import type { SearchColumn } from '../../types';
import { parseConditionSegment } from './conditionParser';

const nameColumn: SearchColumn = {
  field: 'name',
  headerName: 'Name',
  searchable: true,
  type: 'text',
};

const stockColumn: SearchColumn = {
  field: 'stock',
  headerName: 'Stock',
  searchable: true,
  type: 'number',
};

const columns = [nameColumn, stockColumn];

describe('conditionParser', () => {
  it('parses multi-column and same-column condition segments', () => {
    expect(
      parseConditionSegment('#stock #greaterThan 10##', nameColumn, columns)
    ).toEqual({
      operator: 'greaterThan',
      value: '10',
      field: 'stock',
      column: stockColumn,
    });

    expect(
      parseConditionSegment('#equals aspirin', nameColumn, columns)
    ).toEqual({
      operator: 'equals',
      value: 'aspirin',
      field: 'name',
      column: nameColumn,
    });
  });

  it('parses inRange conditions with #to and dash formats', () => {
    expect(
      parseConditionSegment('#stock #inRange 5 #to 9', nameColumn, columns)
    ).toEqual({
      operator: 'inRange',
      value: '5',
      valueTo: '9',
      field: 'stock',
      column: stockColumn,
    });

    expect(
      parseConditionSegment('#inRange 100-200', stockColumn, columns)
    ).toEqual({
      operator: 'inRange',
      value: '100',
      valueTo: '200',
      field: 'stock',
      column: stockColumn,
    });

    expect(
      parseConditionSegment('#stock #inRange 100', nameColumn, columns)
    ).toEqual({
      operator: 'inRange',
      value: '100',
      field: 'stock',
      column: stockColumn,
    });

    expect(parseConditionSegment('#inRange 100', stockColumn, columns)).toEqual(
      {
        operator: 'inRange',
        value: '100',
        field: 'stock',
        column: stockColumn,
      }
    );
  });

  it('returns null for invalid segments', () => {
    expect(parseConditionSegment('', nameColumn, columns)).toBeNull();
    expect(
      parseConditionSegment('#unknown #equals x', nameColumn, columns)
    ).toBeNull();
    expect(
      parseConditionSegment('#name #unknown x', nameColumn, columns)
    ).toBeNull();
  });
});
