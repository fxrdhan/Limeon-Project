import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  transformItemForDisplay,
  transformItemsForDisplay,
  useItemsDisplayTransform,
} from './useItemsDisplayTransform';

describe('useItemsDisplayTransform', () => {
  it('keeps original object reference when no code mode is active', () => {
    const item = {
      id: '1',
      manufacturer: { name: 'Produsen A', code: 'PA' },
    };

    const transformed = transformItemForDisplay(item, {
      'manufacturer.name': 'name',
    });

    expect(transformed).toBe(item);
  });

  it('replaces reference name with code for mapped and fallback colIds', () => {
    const item = {
      id: '1',
      manufacturer: { name: 'Produsen A', code: 'PA' },
      type: { name: 'Tablet', code: 'TB' },
      category: { name: 'Kategori A', code: null },
    };

    const transformed = transformItemForDisplay(item, {
      'manufacturer.name': 'code',
      'type.custom': 'code',
      'category.name': 'code',
    });

    expect(transformed).not.toBe(item);
    expect(transformed.manufacturer.name).toBe('PA');
    expect(transformed.type.name).toBe('TB');
    expect(transformed.category.name).toBe('Kategori A');
  });

  it('returns input for non-object values and ignores unknown column keys', () => {
    expect(
      transformItemForDisplay(null as unknown as Record<string, unknown>, {
        'manufacturer.name': 'code',
      })
    ).toBeNull();

    const item = { id: 'x', manufacturer: { name: 'A', code: 'A1' } };
    const transformed = transformItemForDisplay(item, {
      unknown: 'code',
    });

    expect(transformed).toBe(item);
  });

  it('keeps reference unchanged when code mode is active but no replace is needed', () => {
    const item = {
      id: '2',
      manufacturer: 'plain-string',
      category: { name: 'CAT', code: 'CAT' },
    };

    const transformed = transformItemForDisplay(item as never, {
      'manufacturer.name': 'code',
      'category.name': 'code',
    });

    expect(transformed).toBe(item as never);
  });

  it('transforms arrays only when needed and preserves unchanged array references', () => {
    const items = [
      { id: '1', package: { name: 'Strip', code: 'STR' } },
      { id: '2', package: { name: 'Box', code: 'BOX' } },
    ];

    const unchanged = transformItemsForDisplay(items, {});
    expect(unchanged).toBe(items);

    const changed = transformItemsForDisplay(items, { 'package.name': 'code' });
    expect(changed).not.toBe(items);
    expect(changed[0].package.name).toBe('STR');
    expect(changed[1].package.name).toBe('BOX');

    expect(
      transformItemsForDisplay(undefined, { 'package.name': 'code' })
    ).toEqual([]);
    expect(transformItemsForDisplay([], { 'package.name': 'code' })).toEqual(
      []
    );
  });

  it('memoizes transformed output across rerenders with stable dependencies', () => {
    const items = [
      { id: '1', dosage: { name: '500mg', code: 'D500' } },
      { id: '2', dosage: { name: '250mg', code: 'D250' } },
    ];
    const displayModes = { 'dosage.name': 'code' } as const;

    const { result, rerender } = renderHook(
      ({ hookItems, hookModes }) =>
        useItemsDisplayTransform(hookItems, hookModes),
      {
        initialProps: {
          hookItems: items,
          hookModes: displayModes,
        },
      }
    );

    const first = result.current;
    expect(first[0].dosage.name).toBe('D500');

    rerender({
      hookItems: items,
      hookModes: displayModes,
    });

    expect(result.current).toBe(first);
  });
});
