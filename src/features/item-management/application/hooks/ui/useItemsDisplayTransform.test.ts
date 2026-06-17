import { describe, expect, it } from 'vite-plus/test';
import {
  transformItemForDisplay,
  transformItemsForDisplay,
  type DisplayModes,
} from './useItemsDisplayTransform';

interface DisplayTransformTestItem {
  id: string;
  manufacturer?: {
    code?: string | null;
    name?: string | null;
    source?: string;
  } | null;
  category?: {
    code?: string | null;
    name?: string | null;
  } | null;
  type?: string | null;
}

const displayModes = (overrides: DisplayModes = {}): DisplayModes => ({
  'manufacturer.name': 'name',
  'category.name': 'name',
  'type.name': 'name',
  'package.name': 'name',
  'dosage.name': 'name',
  ...overrides,
});

describe('item display transform', () => {
  it('preserves row and array identity when no reference columns use code mode', () => {
    const item: DisplayTransformTestItem = {
      id: 'item-1',
      manufacturer: { code: 'MFR', name: 'Manufacturer' },
    };
    const items = [item];

    expect(transformItemForDisplay(item, displayModes())).toBe(item);
    expect(transformItemsForDisplay(items, displayModes())).toBe(items);
  });

  it('uses reference codes for code-mode columns without mutating source rows', () => {
    const item: DisplayTransformTestItem = {
      id: 'item-1',
      manufacturer: {
        code: 'MFR',
        name: 'Manufacturer',
        source: 'supplier',
      },
      category: { code: 'CAT', name: 'Category' },
    };

    const transformed = transformItemForDisplay(
      item,
      displayModes({
        'manufacturer.name': 'code',
        'category.name': 'code',
      })
    );

    expect(transformed).not.toBe(item);
    expect(transformed.manufacturer).toEqual({
      code: 'MFR',
      name: 'MFR',
      source: 'supplier',
    });
    expect(transformed.category).toEqual({ code: 'CAT', name: 'CAT' });
    expect(item.manufacturer?.name).toBe('Manufacturer');
    expect(item.category?.name).toBe('Category');
  });

  it('ignores malformed references and empty codes', () => {
    const item: DisplayTransformTestItem = {
      id: 'item-1',
      manufacturer: { code: '', name: 'Manufacturer' },
      category: null,
      type: 'medicine',
    };

    expect(
      transformItemForDisplay(
        item,
        displayModes({
          'manufacturer.name': 'code',
          'category.name': 'code',
          'type.name': 'code',
        })
      )
    ).toBe(item);
  });
});
