import { describe, expect, it } from 'vitest';
import type { FilterSearch, SearchColumn } from '../types';
import {
  buildConditionPart,
  buildNConditionsPattern,
  buildPartialPattern,
  restoreConfirmedPattern,
  restorePatternFromState,
} from './patternRestoration';

const textColumn: SearchColumn = {
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

describe('patternRestoration', () => {
  it('builds condition part with and without #to marker', () => {
    expect(buildConditionPart('name', 'contains', 'aspirin')).toBe(
      '#name #contains aspirin'
    );
    expect(buildConditionPart('stock', 'inRange', '1', '9')).toBe(
      '#stock #inRange 1 #to 9'
    );
  });

  it('restores grouped patterns', () => {
    const filter: FilterSearch = {
      field: 'name',
      value: 'aspirin',
      column: textColumn,
      operator: 'contains',
      isExplicitOperator: true,
      filterGroup: {
        kind: 'group',
        join: 'AND',
        nodes: [
          {
            kind: 'condition',
            field: 'name',
            operator: 'contains',
            value: 'aspirin',
          },
          {
            kind: 'condition',
            field: 'stock',
            operator: 'greaterThan',
            value: '10',
          },
        ],
      },
    };

    expect(restoreConfirmedPattern(filter)).toBe(
      '#( #name #contains aspirin #and #stock #greaterThan 10 #)##'
    );
  });

  it('restores single condition patterns', () => {
    const single: FilterSearch = {
      field: 'name',
      value: 'aspirin',
      column: textColumn,
      operator: 'contains',
      isExplicitOperator: true,
    };

    const withValueTo: FilterSearch = {
      ...single,
      field: 'stock',
      column: stockColumn,
      operator: 'inRange',
      value: '5',
      valueTo: '10',
    };

    expect(restoreConfirmedPattern(single)).toBe('#name #contains aspirin##');
    expect(restoreConfirmedPattern(withValueTo)).toBe(
      '#stock #inRange 5 #to 10##'
    );
  });

  it('restores multi-condition same-column and multi-column patterns', () => {
    const sameColumn: FilterSearch = {
      field: 'name',
      value: 'aspirin',
      column: textColumn,
      operator: 'contains',
      isExplicitOperator: true,
      isMultiCondition: true,
      joinOperator: 'OR',
      conditions: [
        { operator: 'contains', value: 'aspirin', field: 'name' },
        { operator: 'equals', value: 'ibuprofen', field: 'name' },
      ],
    };

    const multiColumn: FilterSearch = {
      ...sameColumn,
      joins: ['AND'],
      isMultiColumn: true,
      conditions: [
        { operator: 'contains', value: 'aspirin', field: 'name' },
        { operator: 'greaterThan', value: '10', field: 'stock' },
      ],
    };

    expect(restoreConfirmedPattern(sameColumn)).toBe(
      '#name #contains aspirin #or #equals ibuprofen##'
    );
    expect(restoreConfirmedPattern(multiColumn)).toBe(
      '#name #contains aspirin #and #stock #greaterThan 10##'
    );
  });

  it('restores from search state', () => {
    expect(
      restorePatternFromState({
        showColumnSelector: false,
        showOperatorSelector: false,
        showJoinOperatorSelector: false,
        isFilterMode: false,
      })
    ).toBeNull();

    expect(
      restorePatternFromState({
        showColumnSelector: false,
        showOperatorSelector: false,
        showJoinOperatorSelector: false,
        isFilterMode: true,
        filterSearch: {
          field: 'name',
          value: 'aspirin',
          column: textColumn,
          operator: 'contains',
          isExplicitOperator: true,
        },
      })
    ).toBe('#name #contains aspirin##');
  });

  it('builds partial pattern for single condition with selector modes', () => {
    const filter: FilterSearch = {
      field: 'name',
      value: 'aspirin',
      column: textColumn,
      operator: 'contains',
      isExplicitOperator: true,
    };

    expect(buildPartialPattern(filter)).toBe('#name #contains aspirin');
    expect(buildPartialPattern(filter, { openSelector: 'join' })).toBe(
      '#name #contains aspirin #'
    );
    expect(buildPartialPattern(filter, { openSelector: 'operator' })).toBe(
      '#name #'
    );
    expect(buildPartialPattern(filter, { openSelector: 'column' })).toBe('#');
  });

  it('builds partial pattern for multi-condition variants', () => {
    const filter: FilterSearch = {
      field: 'name',
      value: 'aspirin',
      column: textColumn,
      operator: 'contains',
      isExplicitOperator: true,
      isMultiCondition: true,
      joinOperator: 'OR',
      conditions: [
        { operator: 'contains', value: 'aspirin', field: 'name' },
        { operator: 'equals', value: 'ibuprofen', field: 'name' },
        { operator: 'startsWith', value: 'par', field: 'name' },
      ],
    };

    expect(buildPartialPattern(filter, { firstConditionOnly: true })).toBe(
      '#name #contains aspirin'
    );

    expect(buildPartialPattern(filter, { upToConditionIndex: 1 })).toBe(
      '#name #contains aspirin #or #equals ibuprofen'
    );

    expect(
      buildPartialPattern(
        {
          ...filter,
          isMultiColumn: true,
          conditions: [
            { operator: 'contains', value: 'aspirin', field: 'name' },
            { operator: 'greaterThan', value: '10', field: 'stock' },
          ],
        },
        { openSelector: 'join' }
      )
    ).toBe('#name #contains aspirin #or #stock #greaterThan 10 #');

    expect(
      buildPartialPattern({
        field: 'name',
        value: 'aspirin',
        column: textColumn,
        operator: 'contains',
        isExplicitOperator: true,
        isMultiCondition: true,
        joinOperator: 'AND',
      })
    ).toBe('');
  });

  it('builds N-condition patterns directly', () => {
    expect(buildNConditionsPattern([], [], false, 'name', true)).toBe('');

    expect(
      buildNConditionsPattern(
        [
          { operator: 'contains', value: 'aspirin', field: 'name' },
          { operator: 'equals', value: 'ibuprofen', field: 'name' },
        ],
        ['OR'],
        false,
        'name',
        true
      )
    ).toBe('#name #contains aspirin #or #equals ibuprofen##');

    expect(
      buildNConditionsPattern(
        [
          { operator: 'contains', value: 'aspirin', field: 'name' },
          { operator: 'greaterThan', value: '10', field: 'stock' },
        ],
        ['AND'],
        true,
        'name',
        false
      )
    ).toBe('#name #contains aspirin #and #stock #greaterThan 10');
  });
});
