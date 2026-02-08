import { describe, expect, it } from 'vitest';
import type { SearchColumn } from '../types';
import { parseSearchValue } from './searchUtils';

const columns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Name',
    searchable: true,
    type: 'text',
  },
  {
    field: 'stock',
    headerName: 'Stock',
    searchable: true,
    type: 'number',
  },
  {
    field: 'code',
    headerName: 'Code',
    searchable: true,
    type: 'text',
  },
];

describe('searchUtils.parseSearchValue', () => {
  it('handles global search and single hashtag trigger', () => {
    expect(parseSearchValue('aspirin', columns)).toEqual({
      globalSearch: 'aspirin',
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: false,
    });

    expect(parseSearchValue('#', columns)).toEqual({
      globalSearch: undefined,
      showColumnSelector: true,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: false,
    });
  });

  it('parses colon syntax and operator-selector colon edge case', () => {
    const colon = parseSearchValue('#name:aspirin', columns);
    expect(colon).toEqual({
      globalSearch: undefined,
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: true,
      filterSearch: {
        field: 'name',
        value: 'aspirin',
        column: columns[0],
        operator: 'contains',
        isExplicitOperator: false,
      },
    });

    const colonOperator = parseSearchValue('#name:#', columns);
    expect(colonOperator).toEqual({
      globalSearch: undefined,
      showColumnSelector: false,
      showOperatorSelector: true,
      showJoinOperatorSelector: false,
      isFilterMode: false,
      selectedColumn: columns[0],
    });
  });

  it('parses regular operators and invalid operator fallback', () => {
    const regular = parseSearchValue('#name #equals aspirin##', columns);
    expect(regular.isFilterMode).toBe(true);
    expect(regular.filterSearch).toEqual(
      expect.objectContaining({
        field: 'name',
        operator: 'equals',
        value: 'aspirin',
        isConfirmed: true,
      })
    );

    const invalidOp = parseSearchValue('#name #unknown aspirin', columns);
    expect(invalidOp).toEqual({
      globalSearch: undefined,
      showColumnSelector: false,
      showOperatorSelector: true,
      showJoinOperatorSelector: false,
      isFilterMode: false,
      selectedColumn: columns[0],
    });
  });

  it('parses join selector triggers including inRange #to format', () => {
    const joinSelector = parseSearchValue('#name #contains aspirin #', columns);
    expect(joinSelector.showJoinOperatorSelector).toBe(true);
    expect(joinSelector.filterSearch).toEqual(
      expect.objectContaining({
        isConfirmed: true,
        isMultiCondition: true,
        conditions: [
          expect.objectContaining({
            field: 'name',
            operator: 'contains',
            value: 'aspirin',
          }),
        ],
      })
    );

    const inRangeJoin = parseSearchValue(
      '#stock #inRange 10 #to 20 #',
      columns
    );
    expect(inRangeJoin.showJoinOperatorSelector).toBe(true);
    expect(inRangeJoin.filterSearch).toEqual(
      expect.objectContaining({
        operator: 'inRange',
        value: '10',
        valueTo: '20',
      })
    );
  });

  it('parses partial joins and next-condition selectors', () => {
    const nextColumn = parseSearchValue(
      '#name #contains aspirin #and #',
      columns
    );
    expect(nextColumn.showColumnSelector).toBe(true);
    expect(nextColumn.partialJoin).toBe('AND');
    expect(nextColumn.activeConditionIndex).toBe(1);

    const nextOperator = parseSearchValue(
      '#name #contains aspirin #and #stock #',
      columns
    );
    expect(nextOperator.showOperatorSelector).toBe(true);
    expect(nextOperator.selectedColumn?.field).toBe('stock');

    const multiPartial = parseSearchValue(
      '#name #contains aspirin #or #equals ibuprofen #',
      columns
    );
    expect(multiPartial.showJoinOperatorSelector).toBe(true);
    expect(multiPartial.activeConditionIndex).toBe(2);
  });

  it('parses grouped and multi-condition confirmed patterns', () => {
    const grouped = parseSearchValue(
      '#( #name #contains aspirin #and #stock #greaterThan 5 #)##',
      columns
    );
    expect(grouped.isFilterMode).toBe(true);
    expect(grouped.filterSearch?.filterGroup).toEqual(
      expect.objectContaining({ kind: 'group' })
    );

    const multi = parseSearchValue(
      '#name #contains aspirin #or #stock #greaterThan 10##',
      columns
    );
    expect(multi.filterSearch).toEqual(
      expect.objectContaining({
        isMultiCondition: true,
        isMultiColumn: true,
        joins: ['OR'],
      })
    );
  });

  it('falls back to exact column match or generic column selector', () => {
    const exactColumn = parseSearchValue('#name', columns);
    expect(exactColumn).toEqual({
      globalSearch: undefined,
      showColumnSelector: false,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: false,
      selectedColumn: columns[0],
    });

    const unknownColumn = parseSearchValue('#does_not_exist', columns);
    expect(unknownColumn).toEqual({
      globalSearch: undefined,
      showColumnSelector: true,
      showOperatorSelector: false,
      showJoinOperatorSelector: false,
      isFilterMode: false,
    });
  });

  it('normalizes leading whitespace and pasted newlines', () => {
    const result = parseSearchValue('  #name #contains aspi\n\nrin##', columns);
    expect(result.filterSearch).toEqual(
      expect.objectContaining({
        field: 'name',
        operator: 'contains',
        value: 'aspirin',
      })
    );
  });
});
