import { describe, expect, it } from 'vitest';
import type { SearchColumn } from '../../types';
import { parseGroupedFilterPattern } from './groupParser';

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

describe('groupParser', () => {
  it('returns null for non-group or unconfirmed patterns', () => {
    expect(
      parseGroupedFilterPattern('#name #contains aspirin##', columns)
    ).toBeNull();
    expect(
      parseGroupedFilterPattern(
        '#( #name #contains aspirin #and #stock #greaterThan 5 #)',
        columns
      )
    ).toBeNull();
  });

  it('parses explicit grouped filter with flat conditions', () => {
    const result = parseGroupedFilterPattern(
      '#( #name #contains aspirin #and #stock #greaterThan 5 #)##',
      columns
    );

    expect(result).not.toBeNull();
    expect(result?.field).toBe('name');
    expect(result?.operator).toBe('contains');
    expect(result?.isMultiCondition).toBe(true);
    expect(result?.joins).toEqual(['AND']);
    expect(result?.conditions).toHaveLength(2);
    expect(result?.filterGroup).toEqual(
      expect.objectContaining({ kind: 'group', join: 'AND' })
    );
  });

  it('parses nested grouped filter and marks multi-column correctly', () => {
    const result = parseGroupedFilterPattern(
      '#( #name #contains aspirin #and #( #stock #greaterThan 5 #or #stock #lessThan 10 #) #)##',
      columns
    );

    expect(result).not.toBeNull();
    expect(result?.filterGroup?.nodes).toHaveLength(2);
    expect(result?.conditions).toBeUndefined();
    expect(result?.isMultiColumn).toBe(true);
  });

  it('returns null for invalid mixed join sequence', () => {
    const invalid = parseGroupedFilterPattern(
      '#( #name #contains aspirin #and #stock #greaterThan 5 #or #stock #lessThan 10 #)##',
      columns
    );

    expect(invalid).toBeNull();
  });

  it('parses inRange condition inside grouped pattern', () => {
    const result = parseGroupedFilterPattern(
      '#( #stock #inRange 10 #to 20 #and #name #contains aspirin #)##',
      columns
    );

    expect(result).not.toBeNull();
    expect(result?.conditions?.[0]).toEqual(
      expect.objectContaining({
        operator: 'inRange',
        value: '10',
        valueTo: '20',
      })
    );
  });

  it('covers malformed grouped tokens and invalid join sequences', () => {
    expect(
      parseGroupedFilterPattern('#( #name #contains aspirin #) foo##', columns)
    ).toBeNull();
    expect(
      parseGroupedFilterPattern(
        '#( #name #contains aspirin #name #contains ibuprofen #)##',
        columns
      )
    ).toBeNull();
    expect(
      parseGroupedFilterPattern('#( #name #contains aspirin #and #)##', columns)
    ).toBeNull();
    expect(
      parseGroupedFilterPattern('#( #name #contains aspirin #) #)##', columns)
    ).toBeNull();
  });

  it('covers invalid grouped condition shapes and unresolved columns/operators', () => {
    expect(parseGroupedFilterPattern('#( aspirin #)##', columns)).toBeNull();
    expect(
      parseGroupedFilterPattern('#( #name aspirin #)##', columns)
    ).toBeNull();
    expect(
      parseGroupedFilterPattern('#( #name #contains #)##', columns)
    ).toBeNull();
    expect(
      parseGroupedFilterPattern('#( #unknown #contains aspirin #)##', columns)
    ).toBeNull();
    expect(
      parseGroupedFilterPattern('#( #name #between aspirin #)##', columns)
    ).toBeNull();
  });

  it('covers grouped inRange fallbacks, open groups, and trailing-token leftovers', () => {
    const topLevelMixed = parseGroupedFilterPattern(
      '#name #contains aspirin #and #( #stock #inRange 10-20 #)##',
      columns
    );
    expect(topLevelMixed).not.toBeNull();
    expect(topLevelMixed?.filterGroup?.isExplicit).toBe(false);
    expect(topLevelMixed?.joinOperator).toBe('AND');
    expect(topLevelMixed?.valueTo).toBeUndefined();

    const unclosedGroup = parseGroupedFilterPattern(
      '#( #name #contains aspirin##',
      columns
    );
    expect(unclosedGroup).not.toBeNull();
    expect(unclosedGroup?.filterGroup).toEqual(
      expect.objectContaining({ isClosed: false })
    );

    expect(
      parseGroupedFilterPattern('#( #stock #inRange 10 #to #)##', columns)
    ).toBeNull();
    expect(
      parseGroupedFilterPattern('#( #stock #inRange 10 #)##', columns)
    ).toBeNull();

    expect(
      parseGroupedFilterPattern(
        '#( #name #contains aspirin #) trailing##',
        columns
      )
    ).toBeNull();
    expect(
      parseGroupedFilterPattern('#( #name #contains aspirin #) ####', columns)
    ).toBeNull();
  });

  it('returns null when top-level sequence has multiple nodes without join', () => {
    expect(
      parseGroupedFilterPattern(
        '#( #name #contains aspirin #) #( #stock #greaterThan 1 #)##',
        columns
      )
    ).toBeNull();
  });

  it('returns null when no condition exists in nested group tree', () => {
    expect(parseGroupedFilterPattern('#( #( #) #)##', columns)).toBeNull();
  });
});
