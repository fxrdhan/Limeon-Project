import { describe, it, expect } from 'vitest';
import {
  itemSearchColumns,
  orderSearchColumns,
  getSearchColumnsByEntity,
  getOrderedSearchColumnsByEntity,
} from './searchColumns';

describe('searchColumns utilities', () => {
  it('orders columns based on user preference', () => {
    const ordered = orderSearchColumns(itemSearchColumns, ['code', 'name']);

    expect(ordered[0].field).toBe('code');
    expect(ordered[1].field).toBe('name');
    expect(ordered.length).toBe(itemSearchColumns.length);
  });

  it('returns original columns when no order provided', () => {
    const ordered = orderSearchColumns(itemSearchColumns);
    expect(ordered).toBe(itemSearchColumns);
  });

  it('gets columns by entity type', () => {
    expect(getSearchColumnsByEntity('items').length).toBeGreaterThan(0);
    expect(getSearchColumnsByEntity('doctors').length).toBeGreaterThan(0);
    expect(getSearchColumnsByEntity('patients').length).toBeGreaterThan(0);
    expect(getSearchColumnsByEntity('customers').length).toBeGreaterThan(0);
    expect(getSearchColumnsByEntity('suppliers').length).toBeGreaterThan(0);
    expect(getSearchColumnsByEntity('categories').length).toBeGreaterThan(0);
    expect(getSearchColumnsByEntity('types').length).toBeGreaterThan(0);
    expect(getSearchColumnsByEntity('item_types').length).toBeGreaterThan(0);
    expect(getSearchColumnsByEntity('packages').length).toBeGreaterThan(0);
    expect(getSearchColumnsByEntity('item_packages').length).toBeGreaterThan(0);
    expect(getSearchColumnsByEntity('dosages').length).toBeGreaterThan(0);
    expect(getSearchColumnsByEntity('item_dosages').length).toBeGreaterThan(0);
    expect(getSearchColumnsByEntity('manufacturers').length).toBeGreaterThan(0);
    expect(
      getSearchColumnsByEntity('item_manufacturers').length
    ).toBeGreaterThan(0);
    expect(getSearchColumnsByEntity('units').length).toBeGreaterThan(0);
    expect(getSearchColumnsByEntity('item_units').length).toBeGreaterThan(0);
    expect(getSearchColumnsByEntity('unknown')).toEqual([]);
  });

  it('returns ordered columns for entity', () => {
    const ordered = getOrderedSearchColumnsByEntity('items', ['code']);
    expect(ordered[0].field).toBe('code');
  });

  it('ignores unknown columns in ordering', () => {
    const ordered = orderSearchColumns(itemSearchColumns, ['unknown', 'code']);
    expect(ordered[0].field).toBe('code');
  });
});
