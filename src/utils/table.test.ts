import { describe, it, expect } from 'vitest';
import { calculateColumnWidths, filterData, sortData } from './table';
import type { ColumnConfig } from '@/types/table';

describe('table utilities', () => {
  it('calculates column widths with scaling', () => {
    const columns: ColumnConfig[] = [
      { key: 'name', header: 'Name', minWidth: 200 },
      { key: 'code', header: 'Code', minWidth: 200 },
      { key: 'qty', header: 'Qty', minWidth: 200 },
    ];

    const data = [
      { name: 'Alpha', code: 'A', qty: 1 },
      { name: 'Beta', code: 'B', qty: 2 },
    ];

    const widths = calculateColumnWidths(columns, data, 320);
    expect(widths.name).toBeGreaterThanOrEqual(40);
    expect(Object.keys(widths)).toHaveLength(3);
  });

  it('distributes remaining space when under available width', () => {
    const columns: ColumnConfig[] = [
      { key: 'name', header: 'Name' },
      { key: 'code', header: 'Code' },
    ];

    const data = [{ name: 'Alpha', code: 'A' }];
    const widths = calculateColumnWidths(columns, data, 1000);
    expect(widths.name).toBeGreaterThan(0);
    expect(widths.code).toBeGreaterThan(0);
  });

  it('calculates widths with mixed content and constraints', () => {
    const columns: ColumnConfig[] = [
      { key: 'name', header: 'Name', minWidth: 80, maxWidth: 200 },
      { key: 'tags', header: 'Tags', minWidth: 80, maxWidth: 200 },
    ];

    const data = [
      { name: { name: 'Alpha' }, tags: [{ name: 'LongTagName' }, 'Extra'] },
      { name: { name: 'Beta' }, tags: [] },
    ];

    const widths = calculateColumnWidths(columns, data, 260);
    expect(widths.name).toBeGreaterThanOrEqual(40);
    expect(widths.tags).toBeGreaterThanOrEqual(40);
  });

  it('handles empty content lengths and mixed min widths', () => {
    const columns: ColumnConfig[] = [
      { key: 'name', header: 'Name', minWidth: 200 },
      { key: 'code', header: 'Code' },
    ];

    const data = [{ name: null, code: null }];

    const widths = calculateColumnWidths(columns, data, 320);
    expect(widths.name).toBeGreaterThanOrEqual(40);
    expect(widths.code).toBeGreaterThanOrEqual(40);
  });

  it('respects min width when scaling down', () => {
    const columns: ColumnConfig[] = [
      { key: 'name', header: 'Name', minWidth: 150 },
      { key: 'code', header: 'Code', minWidth: 150 },
    ];

    const data = [
      { name: 'VeryLongNameThatForcesWideColumn', code: 'X' },
      { name: 'AnotherVeryLongNameThatForcesWideColumn', code: 'Y' },
    ];

    const widths = calculateColumnWidths(columns, data, 320);
    expect(widths.name).toBeGreaterThanOrEqual(150);
    expect(widths.code).toBeGreaterThanOrEqual(150);
  });

  it('filters data based on column searches', () => {
    const columns: ColumnConfig[] = [
      { key: 'name', header: 'Name' },
      { key: 'price', header: 'Price' },
      { key: 'tags', header: 'Tags' },
      { key: 'status', header: 'Status' },
    ];

    const data = [
      {
        name: { name: 'Alpha' },
        price: 1000,
        tags: ['one', 'two'],
        status: 'Active',
      },
      {
        name: { name: 'Beta' },
        price: 2000,
        tags: ['three'],
        status: 'Inactive',
      },
    ];

    const filtered = filterData(
      data,
      { name: 'alpha', price: '1.000', status: 'active' },
      columns
    );

    expect(filtered).toHaveLength(1);

    const passthrough = filterData(data, {}, columns);
    expect(passthrough).toEqual(data);
  });

  it('handles empty searches and null values', () => {
    const columns: ColumnConfig[] = [
      { key: 'name', header: 'Name' },
      { key: 'status', header: 'Status' },
    ];

    const data = [
      { name: 'Alpha', status: null },
      { name: 'Beta', status: 'Active' },
    ];

    const filtered = filterData(data, { status: 'active' }, columns);
    expect(filtered).toHaveLength(1);

    const all = filterData(data, { name: '   ' }, columns);
    expect(all).toHaveLength(2);
  });

  it('filters array values with object names', () => {
    const columns: ColumnConfig[] = [{ key: 'tags', header: 'Tags' }];

    const data = [
      { tags: [{ name: 'Alpha' }, { name: 'Beta' }] },
      { tags: [{ name: 'Gamma' }] },
    ];

    const filtered = filterData(data, { tags: 'beta' }, columns);
    expect(filtered).toHaveLength(1);
  });

  it('filters array values with mixed items', () => {
    const columns: ColumnConfig[] = [{ key: 'tags', header: 'Tags' }];

    const data = [
      { tags: [{ name: 'Alpha' }, 'Gamma'] },
      { tags: [{ name: 'Beta' }, 'Delta'] },
    ];

    const filtered = filterData(data, { tags: 'gamma' }, columns);
    expect(filtered).toHaveLength(1);
  });

  it('sorts data with different directions', () => {
    const original = [
      { name: { name: 'Beta' }, qty: 2 },
      { name: { name: 'Alpha' }, qty: 1 },
    ];

    const sortedAsc = sortData(original, 'qty', 'asc', original);
    expect(sortedAsc[0].qty).toBe(1);

    const sortedDesc = sortData(original, 'name', 'desc', original);
    expect(sortedDesc[0].name.name).toBe('Beta');

    const sortedAscStrings = sortData(
      [{ label: 'b' }, { label: 'a' }],
      'label',
      'asc',
      []
    );
    expect(sortedAscStrings[0].label).toBe('a');

    const sortedDescNumbers = sortData(
      [{ qty: 1 }, { qty: 3 }],
      'qty',
      'desc',
      []
    );
    expect(sortedDescNumbers[0].qty).toBe(3);

    const sortedWithNulls = sortData(
      [{ name: null }, { name: { name: 'Alpha' } }],
      'name',
      'asc',
      []
    );
    expect(sortedWithNulls[0].name).toBeNull();

    const sortedWithUndefined = sortData(
      [{ name: undefined }, { name: 'Beta' }],
      'name',
      'asc',
      []
    );
    expect(sortedWithUndefined[0].name).toBeUndefined();

    const reset = sortData([], 'name', 'original', original);
    expect(reset).toEqual(original);
  });

  it('sorts when values are null or undefined', () => {
    const sorted = sortData(
      [{ name: undefined }, { name: null }, { name: 'Beta' }],
      'name',
      'asc',
      []
    );

    expect(sorted).toHaveLength(3);
  });
});
