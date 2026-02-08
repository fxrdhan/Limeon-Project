import { describe, expect, it } from 'vitest';
import type { SearchColumn } from '../../types';
import {
  parseMultiConditionFilter,
  parsePartialNConditions,
} from './multiConditionParser';

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

const codeColumn: SearchColumn = {
  field: 'code',
  headerName: 'Code',
  searchable: true,
  type: 'text',
};

const columns = [nameColumn, stockColumn, codeColumn];

describe('multiConditionParser', () => {
  it('returns null for patterns without joins or already confirmed partials', () => {
    expect(
      parsePartialNConditions('#name #contains aspirin', columns)
    ).toBeNull();
    expect(
      parsePartialNConditions(
        '#name #contains aspirin #and #equals ibu##',
        columns
      )
    ).toBeNull();
  });

  it('parses partial patterns and opens join selector', () => {
    const result = parsePartialNConditions(
      '#name #contains aspirin #and #equals ibuprofen #',
      columns
    );

    expect(result).not.toBeNull();
    expect(result?.showJoinOperatorSelector).toBe(true);
    expect(result?.activeConditionIndex).toBe(2);
    expect(result?.joins).toEqual(['AND']);
    expect(result?.partialConditions?.[0]).toEqual(
      expect.objectContaining({
        field: 'name',
        operator: 'contains',
        value: 'aspirin',
      })
    );
  });

  it('parses partial patterns with next column and operator selection', () => {
    const nextColumn = parsePartialNConditions(
      '#name #contains aspirin #and #',
      columns
    );
    expect(nextColumn?.showColumnSelector).toBe(true);
    expect(nextColumn?.partialConditions?.[1]).toEqual({});

    const nextOperator = parsePartialNConditions(
      '#name #contains aspirin #and #stock #',
      columns
    );
    expect(nextOperator?.showOperatorSelector).toBe(true);
    expect(nextOperator?.selectedColumn?.field).toBe('stock');
    expect(nextOperator?.partialConditions?.[1]).toEqual(
      expect.objectContaining({ field: 'stock' })
    );
  });

  it('parses confirmed multi-condition filter for same-column and multi-column cases', () => {
    const sameColumn = parseMultiConditionFilter(
      '#name #contains aspirin #and #equals ibuprofen##',
      nameColumn,
      columns
    );

    expect(sameColumn).not.toBeNull();
    expect(sameColumn?.conditions).toHaveLength(2);
    expect(sameColumn?.isMultiCondition).toBe(true);
    expect(sameColumn?.isMultiColumn).toBe(false);
    expect(sameColumn?.joins).toEqual(['AND']);

    const multiColumn = parseMultiConditionFilter(
      '#name #contains aspirin #or #stock #greaterThan 10##',
      nameColumn,
      columns
    );

    expect(multiColumn).not.toBeNull();
    expect(multiColumn?.isMultiColumn).toBe(true);
    expect(multiColumn?.conditions?.[1]).toEqual(
      expect.objectContaining({
        field: 'stock',
        operator: 'greaterThan',
        value: '10',
      })
    );
  });

  it('returns null for incomplete multi-condition confirmations', () => {
    expect(
      parseMultiConditionFilter(
        '#name #contains aspirin #and #equals ibuprofen',
        nameColumn,
        columns
      )
    ).toBeNull();

    expect(
      parseMultiConditionFilter(
        '#name #contains aspirin##',
        nameColumn,
        columns
      )
    ).toBeNull();
  });
});
