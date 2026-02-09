import { describe, expect, it } from 'vitest';
import type { FilterGroup, SearchColumn } from './types';
import {
  findFirstConditionInGroup,
  findGroupNodeAtPath,
  getActiveGroupJoin,
  removeGroupNodeAtPath,
  stepBackPatternValue,
  unwrapGroupAtPath,
  updateGroupConditionColumn,
  updateGroupConditionOperator,
  updateGroupConditionValue,
  updateGroupJoinAtPath,
} from './EnhancedSearchBar';

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

const makeGroup = (): FilterGroup => ({
  kind: 'group',
  join: 'AND',
  nodes: [
    {
      kind: 'condition',
      field: 'name',
      column: nameColumn,
      operator: 'contains',
      value: 'aspirin',
    },
    {
      kind: 'group',
      join: 'OR',
      nodes: [
        {
          kind: 'condition',
          field: 'stock',
          column: stockColumn,
          operator: 'equals',
          value: '10',
        },
      ],
    },
  ],
});

describe('EnhancedSearchBar helpers', () => {
  it('updates grouped condition value and valueTo payloads', () => {
    const group = makeGroup();

    expect(updateGroupConditionValue(group, [], 'value', 'x')).toBe(group);

    const updatedValue = updateGroupConditionValue(group, [0], 'value', 'ibu');
    expect(updatedValue.nodes[0]).toMatchObject({ value: 'ibu' });

    const updatedValueTo = updateGroupConditionValue(
      group,
      [1, 0],
      'valueTo',
      '15'
    );
    expect(updatedValueTo.nodes[1]).toMatchObject({
      nodes: [expect.objectContaining({ valueTo: '15' })],
    });
  });

  it('updates grouped condition column and operator', () => {
    const group = makeGroup();
    const newColumn: SearchColumn = {
      field: 'category',
      headerName: 'Category',
      searchable: true,
      type: 'text',
    };

    const updatedColumn = updateGroupConditionColumn(group, [0], newColumn);
    expect(updatedColumn.nodes[0]).toMatchObject({
      field: 'category',
      column: newColumn,
    });

    const betweenGroup = updateGroupConditionOperator(group, [1, 0], 'inRange');
    expect(betweenGroup.nodes[1]).toMatchObject({
      nodes: [expect.objectContaining({ operator: 'inRange', valueTo: '10' })],
    });
  });

  it('updates and resolves group joins and nested paths', () => {
    const group = makeGroup();

    expect(updateGroupJoinAtPath(group, [], 'OR').join).toBe('OR');
    expect(updateGroupJoinAtPath(group, [1], 'AND').nodes[1]).toMatchObject({
      join: 'AND',
    });

    expect(findGroupNodeAtPath(group, [])).toBe(group);
    expect(findGroupNodeAtPath(group, [1, 0])).toMatchObject({
      kind: 'condition',
      field: 'stock',
    });
    expect(findGroupNodeAtPath(group, [99])).toBeUndefined();
  });

  it('removes and unwraps grouped nodes', () => {
    const group = makeGroup();

    const removedCondition = removeGroupNodeAtPath(group, [0]);
    expect(removedCondition.nodes).toHaveLength(1);

    const removedNestedCondition = removeGroupNodeAtPath(group, [1, 0]);
    expect(removedNestedCondition.nodes).toHaveLength(1);
    expect(removedNestedCondition.nodes[0]).toMatchObject({
      kind: 'condition',
    });

    const unwrapped = unwrapGroupAtPath(group, [1]);
    expect(unwrapped.nodes).toHaveLength(2);
    expect(unwrapped.nodes[1]).toMatchObject({
      kind: 'condition',
      field: 'stock',
    });
  });

  it('finds first nested condition and active group join state', () => {
    const nestedOnly: FilterGroup = {
      kind: 'group',
      join: 'AND',
      nodes: [{ kind: 'group', join: 'OR', nodes: [makeGroup().nodes[0]] }],
    };
    expect(findFirstConditionInGroup(nestedOnly)).toMatchObject({
      field: 'name',
    });
    expect(
      findFirstConditionInGroup({ kind: 'group', join: 'AND', nodes: [] })
    ).toBeUndefined();

    expect(getActiveGroupJoin('#( #name #contains aspirin #or #')).toEqual({
      depth: 1,
      join: 'OR',
    });
    expect(
      getActiveGroupJoin(
        '#( #name #contains aspirin #and #( #stock #equals 1 #or #'
      )
    ).toEqual({
      depth: 2,
      join: 'OR',
    });
    expect(getActiveGroupJoin('#name #contains aspirin##')).toEqual({
      depth: 0,
      join: undefined,
    });
  });

  it('steps back one badge from pattern tail while preserving confirmation semantics', () => {
    expect(stepBackPatternValue('plain text', false)).toMatchObject({
      handled: false,
    });

    expect(stepBackPatternValue('#name #contains aspirin##', false)).toEqual({
      handled: true,
      nextValue: '#name #contains ',
      nextCarry: true,
    });

    expect(
      stepBackPatternValue('#name #contains aspirin #and #', false)
    ).toEqual({
      handled: true,
      nextValue: '#name #contains aspirin',
      nextCarry: true,
    });

    expect(stepBackPatternValue('#name #inRange 10 #to 20##', true)).toEqual({
      handled: true,
      nextValue: '#name #inRange 10 #to ',
      nextCarry: true,
    });

    expect(
      stepBackPatternValue('#( #name #contains aspirin #)##', true)
    ).toEqual({
      handled: true,
      nextValue: '#( #name #contains aspirin##',
      nextCarry: true,
    });
  });

  it('covers defensive branches for group mutations and step-back cleanup', () => {
    const base = makeGroup();

    expect(updateGroupConditionColumn(base, [], stockColumn)).toBe(base);
    expect(updateGroupConditionOperator(base, [], 'equals')).toBe(base);
    expect(removeGroupNodeAtPath(base, [])).toBe(base);
    expect(unwrapGroupAtPath(base, [])).toBe(base);
    expect(findGroupNodeAtPath(base, [0, 0])).toBeUndefined();

    const untouchedJoin = updateGroupJoinAtPath(base, [0], 'OR');
    expect(untouchedJoin.nodes[0]).toEqual(base.nodes[0]);

    const collapsedNested = removeGroupNodeAtPath(
      {
        kind: 'group',
        join: 'AND',
        nodes: [
          {
            kind: 'group',
            join: 'AND',
            nodes: [
              {
                kind: 'condition',
                field: 'name',
                column: nameColumn,
                operator: 'contains',
                value: 'a',
              },
            ],
          },
        ],
      },
      [0, 0]
    );
    expect(collapsedNested.nodes).toHaveLength(0);

    expect(stepBackPatternValue('#name #contains #', false)).toEqual({
      handled: true,
      nextValue: '#name #',
      nextCarry: true,
    });
    expect(stepBackPatternValue('#name #inRange 10 #to #', false)).toEqual({
      handled: true,
      nextValue: '#name #inRange 10',
      nextCarry: true,
    });
    expect(stepBackPatternValue('#( #', false)).toEqual({
      handled: true,
      nextValue: '',
      nextCarry: false,
    });
  });
});
