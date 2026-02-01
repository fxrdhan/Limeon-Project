import { describe, it, expect } from 'vitest';
import {
  fuzzyMatch,
  fuzzySearchMatch,
  getScore,
  getSearchState,
} from './search';
import type { Item } from '@/types';

describe('search utilities', () => {
  it('performs fuzzy matching', () => {
    expect(fuzzyMatch('abcdef', 'ace')).toBe(true);
    expect(fuzzyMatch('abcdef', 'afz')).toBe(false);
    expect(fuzzyMatch(null as unknown as string, 'a')).toBe(false);
    expect(fuzzyMatch('abc', null as unknown as string)).toBe(true);
  });

  it('searches nested data structures', () => {
    const data = {
      name: 'Alpha',
      details: { code: 'BETA' },
      list: [{ name: 'Gamma' }],
    };

    expect(fuzzySearchMatch(data, 'alp')).toBe(true);
    expect(fuzzySearchMatch(data, 'gam')).toBe(true);
    expect(fuzzySearchMatch(data, 'zzz')).toBe(false);

    const numericData = { count: 123 };
    expect(fuzzySearchMatch(numericData, '23')).toBe(true);

    const unknownData = { flag: true };
    expect(fuzzySearchMatch(unknownData, 'true')).toBe(false);

    expect(
      fuzzySearchMatch(null as unknown as Record<string, unknown>, 'a')
    ).toBe(true);
    expect(fuzzySearchMatch({ name: null }, 'a')).toBe(false);
    expect(fuzzySearchMatch({ name: 'Alpha' }, '')).toBe(true);
  });

  it('scores items by matching priority', () => {
    const item = {
      name: 'Paracetamol',
      code: 'PARA',
      barcode: '123',
      category: { name: 'Medicine' },
      type: { name: 'Tablet' },
      unit: { name: 'Box' },
      base_price: 10,
      sell_price: 15,
      stock: 5,
      package_conversions: [{ unit: { name: 'Strip' } }],
    } as Item;

    expect(getScore(item, 'para')).toBe(10);
    expect(getScore(item, 'tablet')).toBe(6);
    expect(getScore(item, 'strip')).toBe(1);
    expect(getScore(item, 'zzz')).toBe(0);
    expect(getScore(item, 'para')).toBe(10);
  });

  it('scores other fields when name does not match', () => {
    const item = {
      name: 'Paracetamol',
      code: 'CODE123',
      barcode: 'BAR123',
      category: { name: 'Category' },
      type: { name: 'Type' },
      unit: { name: 'Unit' },
      base_price: 10,
      sell_price: 20,
      stock: 30,
      package_conversions: [{ unit: { name: 'Pack' } }],
    } as Item;

    expect(getScore(item, 'code')).toBe(9);
    expect(getScore(item, 'bar')).toBe(8);
    expect(getScore(item, 'category')).toBe(7);
    expect(getScore(item, 'type')).toBe(6);
    expect(getScore(item, 'unit')).toBe(5);
    expect(getScore(item, '10')).toBe(4);
    expect(getScore(item, '20')).toBe(3);
    expect(getScore(item, '30')).toBe(2);
  });

  it('handles missing fields in score calculation', () => {
    const item = {} as Item;
    expect(getScore(item, 'anything')).toBe(0);
  });

  it('computes search state', () => {
    expect(getSearchState('', '', [])).toBe('idle');
    expect(getSearchState('a', '', [])).toBe('typing');
    expect(getSearchState('a', 'a', ['x'])).toBe('found');
    expect(getSearchState('a', 'a', [])).toBe('not-found');
    expect(getSearchState('a', 'a', null)).toBe('idle');
  });
});
