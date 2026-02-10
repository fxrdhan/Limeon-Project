import { describe, expect, it } from 'vitest';
import type { FilterGroup } from '../types';
import { PatternBuilder } from './PatternBuilder';

describe('PatternBuilder', () => {
  it('builds basic single-condition patterns', () => {
    expect(PatternBuilder.column('name')).toBe('#name');
    expect(PatternBuilder.columnWithOperatorSelector('name')).toBe('#name #');
    expect(PatternBuilder.columnOperator('name', 'contains')).toBe(
      '#name #contains '
    );
    expect(PatternBuilder.confirmed('name', 'contains', 'aspirin')).toBe(
      '#name #contains aspirin##'
    );
  });

  it('builds join-aware and multi-condition patterns', () => {
    expect(PatternBuilder.withJoinSelector('name', 'contains', 'aspirin')).toBe(
      '#name #contains aspirin #'
    );
    expect(
      PatternBuilder.withJoinSelector('stock', 'inRange', '10', '20')
    ).toBe('#stock #inRange 10 #to 20 #');
    expect(PatternBuilder.partialMulti('name', 'contains', 'asp', 'AND')).toBe(
      '#name #contains asp #and #'
    );
    expect(
      PatternBuilder.partialMultiColumnWithValueTo(
        'stock',
        'inRange',
        '1',
        '9',
        'OR'
      )
    ).toBe('#stock #inRange 1 #to 9 #or #');
    expect(
      PatternBuilder.partialMultiWithOperator(
        'name',
        'contains',
        'asp',
        'OR',
        'equals'
      )
    ).toBe('#name #contains asp #or #equals ');
    expect(
      PatternBuilder.multiCondition(
        'name',
        'contains',
        'asp',
        'AND',
        'equals',
        'ibuprofen'
      )
    ).toBe('#name #contains asp #and #equals ibuprofen##');
  });

  it('builds edit patterns', () => {
    expect(PatternBuilder.editFirstValue('name', 'contains', 'asp')).toBe(
      '#name #contains asp'
    );
    expect(
      PatternBuilder.editCondition1Value(
        'name',
        'contains',
        'asp',
        'OR',
        'equals',
        'ibu'
      )
    ).toBe('#name #contains asp #or #equals ibu');
  });

  it('builds between operator patterns', () => {
    expect(PatternBuilder.betweenFirstValue('stock', '1')).toBe(
      '#stock #inRange 1 '
    );
    expect(PatternBuilder.betweenBothValues('stock', '1', '9')).toBe(
      '#stock #inRange 1 9'
    );
    expect(PatternBuilder.betweenConfirmed('stock', '1', '9')).toBe(
      '#stock #inRange 1 9##'
    );
    expect(PatternBuilder.betweenWithJoinSelector('stock', '1', '9')).toBe(
      '#stock #inRange 1 #to 9 #'
    );
    expect(PatternBuilder.betweenMultiPartial('stock', '1', '9', 'AND')).toBe(
      '#stock #inRange 1 #to 9 #and #'
    );
    expect(
      PatternBuilder.betweenAndBetween('stock', '1', '9', 'OR', '11', '20')
    ).toBe('#stock #inRange 1 #to 9 #or #inRange 11 #to 20##');
    expect(
      PatternBuilder.betweenAndNormal(
        'stock',
        '1',
        '9',
        'AND',
        'greaterThan',
        '20'
      )
    ).toBe('#stock #inRange 1 #to 9 #and #greaterThan 20##');
    expect(
      PatternBuilder.normalAndBetween('stock', 'equals', '10', 'OR', '11', '20')
    ).toBe('#stock #equals 10 #or #inRange 11 #to 20##');
    expect(PatternBuilder.editBetweenFirstValue('stock', '11')).toBe(
      '#stock #inRange 11'
    );
    expect(PatternBuilder.editBetweenValueTo('stock', '11', '20')).toBe(
      '#stock #inRange 11 20'
    );
  });

  it('builds multi-column patterns', () => {
    expect(
      PatternBuilder.multiColumnPartial(
        'name',
        'contains',
        'asp',
        'AND',
        'stock'
      )
    ).toBe('#name #contains asp #and #stock #');

    expect(
      PatternBuilder.multiColumnWithOperator(
        'name',
        'contains',
        'asp',
        'AND',
        'stock',
        'greaterThan'
      )
    ).toBe('#name #contains asp #and #stock #greaterThan ');

    expect(
      PatternBuilder.multiColumnWithOperator(
        'stock',
        'inRange',
        '1',
        'OR',
        'price',
        'lessThan',
        '9'
      )
    ).toBe('#stock #inRange 1 #to 9 #or #price #lessThan ');

    expect(
      PatternBuilder.multiColumnComplete(
        'name',
        'contains',
        'asp',
        'AND',
        'stock',
        'equals',
        '10'
      )
    ).toBe('#name #contains asp #and #stock #equals 10##');
  });

  it('builds condition parts and same-column no-field parts', () => {
    expect(PatternBuilder.buildConditionPart('name')).toBe('#name');
    expect(PatternBuilder.buildConditionPart('name', 'contains')).toBe(
      '#name #contains '
    );
    expect(PatternBuilder.buildConditionPart('name', 'contains', 'asp')).toBe(
      '#name #contains asp'
    );
    expect(
      PatternBuilder.buildConditionPart('stock', 'inRange', '1', '9')
    ).toBe('#stock #inRange 1 #to 9');
    expect(
      PatternBuilder.buildConditionPart(
        'name',
        'contains',
        'asp',
        undefined,
        false
      )
    ).toBe(' #contains asp');

    expect(PatternBuilder.conditionPartNoField('equals', 'abc')).toBe(
      '#equals abc'
    );
    expect(PatternBuilder.conditionPartNoField('inRange', '1', '9')).toBe(
      '#inRange 1 #to 9'
    );
  });

  it('builds scalable N-condition patterns with selector and confirmation behavior', () => {
    expect(PatternBuilder.buildNConditions([], [], false, 'name')).toBe('');
    expect(
      PatternBuilder.buildNConditions([], [], false, 'name', {
        openSelector: true,
      })
    ).toBe('#');

    expect(
      PatternBuilder.buildNConditions(
        [
          { field: 'name', operator: 'contains', value: 'asp' },
          { field: 'name', operator: 'equals', value: 'ibu' },
        ],
        ['OR'],
        false,
        'name'
      )
    ).toBe('#name #contains asp #or  #equals ibu##');

    expect(
      PatternBuilder.buildNConditions(
        [
          { field: 'name', operator: 'contains', value: 'asp' },
          { field: 'stock', operator: 'greaterThan', value: '5' },
        ],
        ['AND'],
        true,
        'name'
      )
    ).toBe('#name #contains asp #and #stock #greaterThan 5##');

    expect(
      PatternBuilder.buildNConditions(
        [
          { field: 'name', operator: 'contains', value: 'asp' },
          { field: 'name' },
        ],
        ['OR'],
        false,
        'name',
        { confirmed: false, openSelector: true }
      )
    ).toBe('#name #contains asp #or #name #');

    expect(
      PatternBuilder.buildNConditions(
        [{ field: 'name', operator: 'contains' }],
        [],
        false,
        'name'
      )
    ).toBe('#name #contains ');
  });

  it('builds helper variants from N-condition builder', () => {
    const conditions = [
      { field: 'name', operator: 'contains', value: 'asp' },
      { field: 'name', operator: 'equals', value: 'ibu' },
      { field: 'name', operator: 'startsWith', value: 'par' },
    ];
    const joins: ('AND' | 'OR')[] = ['OR', 'AND'];

    expect(
      PatternBuilder.buildPartialForEdit(conditions, joins, false, 'name', 1)
    ).toBe('#name #contains asp #or  #equals ibu');

    expect(
      PatternBuilder.buildPartialForEdit(conditions, joins, false, 'name')
    ).toBe('#name #contains asp #or  #equals ibu #and  #startsWith par');

    expect(
      PatternBuilder.buildWithSelectorOpen([], [], false, 'name', 'column')
    ).toBe('#');

    expect(
      PatternBuilder.buildWithSelectorOpen(
        conditions,
        joins,
        false,
        'name',
        'operator',
        0
      )
    ).toBe('#name #');

    expect(
      PatternBuilder.buildWithSelectorOpen(
        conditions,
        joins,
        true,
        'name',
        'operator',
        1
      )
    ).toBe('#name #contains asp #or #name #');

    expect(
      PatternBuilder.buildWithSelectorOpen(
        conditions,
        joins,
        false,
        'name',
        'join'
      )
    ).toBe('#name #contains asp #or  #equals ibu #and  #startsWith par #');

    expect(
      PatternBuilder.buildWithSelectorOpen(
        conditions,
        joins,
        false,
        'name',
        'operator',
        99
      )
    ).toBe('#name #contains asp #or  #equals ibu #and  #startsWith par #');

    expect(
      PatternBuilder.withJoinSelectorAtIndex(
        conditions,
        joins,
        false,
        'name',
        1
      )
    ).toBe('#name #contains asp #or  #equals ibu #');

    expect(
      PatternBuilder.confirmedUpToIndex(conditions, joins, false, 'name', 1)
    ).toBe('#name #contains asp #or  #equals ibu##');
  });

  it('builds grouped patterns with and without explicit root wrapping', () => {
    const explicitRoot: FilterGroup = {
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
          value: '5',
        },
      ],
    };

    expect(PatternBuilder.buildGroupedPattern(explicitRoot, true)).toBe(
      '#( #name #contains aspirin #and #stock #greaterThan 5 #)##'
    );

    const implicitRoot: FilterGroup = {
      kind: 'group',
      join: 'AND',
      isExplicit: false,
      nodes: [
        {
          kind: 'condition',
          field: 'name',
          operator: 'contains',
          value: 'aspirin',
        },
        {
          kind: 'group',
          join: 'OR',
          nodes: [
            {
              kind: 'condition',
              field: 'qty',
              operator: 'greaterThan',
              value: '2',
            },
            {
              kind: 'condition',
              field: 'qty',
              operator: 'lessThan',
              value: '8',
            },
          ],
        },
      ],
    };

    expect(PatternBuilder.buildGroupedPattern(implicitRoot, true)).toBe(
      '#name #contains aspirin #and #( #qty #greaterThan 2 #or #qty #lessThan 8 #)##'
    );
    expect(PatternBuilder.buildGroupedPattern(implicitRoot, false)).toBe(
      '#name #contains aspirin #and #( #qty #greaterThan 2 #or #qty #lessThan 8 #)'
    );
  });
});
