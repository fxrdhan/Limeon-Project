import { describe, expect, it } from 'vitest';
import type { FilterSearch, SearchColumn } from '../../types';
import {
  buildColumnValue,
  buildFilterValue,
  countJoins,
  findColumn,
  getOperatorSearchTerm,
  isHashtagMode,
  stripConfirmationMarker,
} from './parserHelpers';

const columns: SearchColumn[] = [
  {
    field: 'name',
    headerName: 'Item Name',
    searchable: true,
    type: 'text',
  },
  {
    field: 'harga_pokok',
    headerName: 'Harga Pokok',
    searchable: true,
    type: 'number',
  },
  {
    field: 'stock',
    headerName: 'Stock',
    searchable: true,
    type: 'number',
  },
];

describe('parserHelpers', () => {
  it('finds columns by exact and flexible matching', () => {
    expect(findColumn(columns, 'name')?.field).toBe('name');
    expect(findColumn(columns, 'Item Name')?.field).toBe('name');
    expect(findColumn(columns, 'harga pokok')?.field).toBe('harga_pokok');
    expect(findColumn(columns, 'HARGA-POKOK')?.field).toBe('harga_pokok');
    expect(findColumn(columns, '')).toBeUndefined();
    expect(findColumn(columns, 'unknown')).toBeUndefined();
  });

  it('counts joins in a pattern', () => {
    expect(countJoins('#name #contains a')).toBe(0);
    expect(countJoins('#name #contains a #and #equals b')).toBe(1);
    expect(countJoins('#name #contains a #and #equals b #or #equals c')).toBe(
      2
    );
  });

  it('strips confirmation markers and join selectors', () => {
    expect(stripConfirmationMarker('600## #')).toBe('600');
    expect(stripConfirmationMarker('600##')).toBe('600');
    expect(stripConfirmationMarker('600 #')).toBe('600');
    expect(stripConfirmationMarker('600')).toBe('600');
  });

  it('detects hashtag mode correctly', () => {
    expect(isHashtagMode('#')).toBe(true);
    expect(isHashtagMode('#name')).toBe(true);
    expect(isHashtagMode('#name:value')).toBe(false);
    expect(isHashtagMode('aspirin')).toBe(false);
  });

  it('extracts operator search term for first, same-column, and multi-column patterns', () => {
    expect(getOperatorSearchTerm('#name #con')).toBe('con');
    expect(getOperatorSearchTerm('#name #contains asp #and #eq')).toBe('eq');
    expect(getOperatorSearchTerm('#name #contains asp #or #stock #gr')).toBe(
      'gr'
    );
    expect(getOperatorSearchTerm('#name')).toBe('');
    expect(getOperatorSearchTerm('aspirin')).toBe('');
  });

  it('builds filter and column patterns', () => {
    const implicitContains: FilterSearch = {
      field: 'name',
      value: 'aspirin',
      column: columns[0],
      operator: 'contains',
      isExplicitOperator: false,
    };

    const explicitFilter: FilterSearch = {
      ...implicitContains,
      operator: 'equals',
      isExplicitOperator: true,
    };

    expect(buildFilterValue(implicitContains, 'paracetamol')).toBe(
      '#name:paracetamol'
    );
    expect(buildFilterValue(explicitFilter, 'paracetamol')).toBe(
      '#name #equals paracetamol'
    );

    expect(buildColumnValue('name', 'colon')).toBe('#name:');
    expect(buildColumnValue('name', 'space')).toBe('#name ');
    expect(buildColumnValue('name', 'plain')).toBe('#name');
  });
});
