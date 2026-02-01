import { describe, it, expect } from 'vitest';
import { classNames } from './classNames';
import {
  formatRupiah,
  formatPercentage,
  extractNumericValue,
  formatDateTime,
} from './formatters';
import {
  calculatePriceForCustomer,
  getItemDiscountForLevel,
  resolveUnitPrice,
} from './pricing';
import { cn } from './utils';
import type { Item, CustomerLevel } from '@/types/database';

describe('lib helpers', () => {
  it('builds class names', () => {
    expect(classNames('a', false, 'b', null, undefined, '')).toBe('a b');
  });

  it('formats rupiah, percentages, and numeric extraction', () => {
    const rupiah = formatRupiah(1000).replace(/\s/g, '');
    expect(rupiah).toContain('Rp');
    expect(rupiah).toContain('1.000');
    expect(formatPercentage(12)).toBe('12%');
    expect(extractNumericValue('Rp 1.234.567')).toBe(1234567);
    expect(extractNumericValue('no digits')).toBe(0);
  });

  it('formats dates and handles invalid inputs', () => {
    expect(formatDateTime(null)).toBe('-');
    const formatted = formatDateTime('2024-01-01T10:00:00Z');
    expect(formatted).toContain('2024');

    const OriginalDate = global.Date;
    class BadDate {
      constructor() {
        throw new Error('bad');
      }
    }
    // @ts-expect-error override for test
    global.Date = BadDate;
    expect(formatDateTime('2024-01-01T10:00:00Z')).toBe('Invalid Date');
    global.Date = OriginalDate;
  });

  it('calculates pricing with conversions and discounts', () => {
    const item = {
      base_price: 100,
      sell_price: 150,
      base_unit: 'pcs',
      unit: { name: 'pcs' },
      package_conversions: [
        {
          to_unit_id: 'box',
          unit_name: 'box',
          base_price: 900,
          sell_price: 1200,
          conversion_rate: 10,
        },
      ],
      is_level_pricing_active: true,
      customer_level_discounts: [
        { customer_level_id: 'lvl1', discount_percentage: 10 },
      ],
    } as Item;

    const resolved = resolveUnitPrice(item, 'box');
    expect(resolved.unitName).toBe('box');
    expect(resolved.baseSellPrice).toBe(1200);

    const resolvedByName = resolveUnitPrice(item, undefined, 'box');
    expect(resolvedByName.unitName).toBe('box');

    expect(getItemDiscountForLevel(item.customer_level_discounts, 'lvl1')).toBe(
      10
    );

    const customerLevel = { id: 'lvl1', price_percentage: 90 } as CustomerLevel;
    const result = calculatePriceForCustomer({ item, customerLevel });
    expect(result.levelPercentage).toBe(90);
    expect(result.itemDiscountPercentage).toBe(10);
  });

  it('resolves conversions by unit name and falls back when conversions missing', () => {
    const item = {
      base_price: 50,
      sell_price: 80,
      base_unit: 'pcs',
      unit: { name: 'pcs' },
      package_conversions: [
        {
          to_unit_id: 'pack',
          unit_name: 'Pack',
          base_price: 200,
          sell_price: 300,
          conversion_rate: 4,
        },
      ],
      is_level_pricing_active: true,
      customer_level_discounts: [],
    } as Item;

    const byName = resolveUnitPrice(item, undefined, 'pack');
    expect(byName.baseSellPrice).toBe(300);

    const fallbackItem = {
      base_price: 10,
      sell_price: 20,
      base_unit: 'pcs',
      unit: { name: 'pcs' },
      package_conversions: null,
    } as Item;

    const fallback = resolveUnitPrice(fallbackItem);
    expect(fallback.baseSellPrice).toBe(20);
  });

  it('resolves conversions by unit id and falls back to base unit names', () => {
    const item = {
      base_price: 100,
      sell_price: 150,
      base_unit: 'pcs',
      unit: { name: 'unit' },
      package_conversions: [
        {
          to_unit_id: 'box',
          unit_name: null,
          base_price: 900,
          sell_price: 1200,
          conversion_rate: 10,
        },
      ],
      customer_level_discounts: [],
    } as Item;

    const resolved = resolveUnitPrice(item, 'box');
    expect(resolved.unitName).toBe('pcs');

    const fallback = resolveUnitPrice({
      base_price: 5,
      sell_price: 8,
      base_unit: undefined,
      unit: { name: 'piece' },
      package_conversions: [],
    } as Item);
    expect(fallback.unitName).toBe('piece');
  });

  it('falls back when unit id or name do not match', () => {
    const item = {
      base_price: 10,
      sell_price: 20,
      base_unit: 'pcs',
      unit: { name: 'pcs' },
      package_conversions: [
        {
          to_unit_id: 'box',
          unit_name: 'Box',
          base_price: 50,
          sell_price: 60,
          conversion_rate: 5,
        },
      ],
    } as Item;

    const byName = resolveUnitPrice(item, 'missing', 'Box');
    expect(byName.baseSellPrice).toBe(60);

    const notFound = resolveUnitPrice(item, 'missing', 'Nope');
    expect(notFound.unitName).toBe('Nope');
  });

  it('handles missing unit names in conversions and fallbacks', () => {
    const item = {
      base_price: 10,
      sell_price: 20,
      base_unit: undefined,
      unit: { name: 'unit' },
      package_conversions: [
        {
          to_unit_id: 'box',
          unit_name: null,
          base_price: 50,
          sell_price: 60,
          conversion_rate: 5,
        },
      ],
    } as Item;

    const resolved = resolveUnitPrice(item, 'box');
    expect(resolved.unitName).toBe('unit');

    const itemNoNames = {
      base_price: 10,
      sell_price: 20,
      base_unit: undefined,
      unit: null,
      package_conversions: [
        {
          to_unit_id: 'box',
          unit_name: null,
          base_price: 50,
          sell_price: 60,
          conversion_rate: 5,
        },
      ],
    } as Item;

    const resolvedEmpty = resolveUnitPrice(itemNoNames, 'box');
    expect(resolvedEmpty.unitName).toBe('');

    const fallbackEmpty = resolveUnitPrice({
      base_price: 1,
      sell_price: 2,
      base_unit: undefined,
      unit: null,
      package_conversions: [],
    } as Item);
    expect(fallbackEmpty.unitName).toBe('');
  });

  it('falls back when conversions are missing or no customer level', () => {
    const item = {
      base_price: '100',
      sell_price: '150',
      base_unit: 'pcs',
      unit: { name: 'pcs' },
      package_conversions: [],
      is_level_pricing_active: true,
      customer_level_discounts: [],
    } as Item;

    const resolved = resolveUnitPrice(item, undefined, 'PACK');
    expect(resolved.unitName).toBe('PACK');
    expect(resolved.basePrice).toBe(100);

    const result = calculatePriceForCustomer({ item });
    expect(result.levelPercentage).toBe(100);
    expect(getItemDiscountForLevel(undefined, null)).toBe(0);
  });

  it('falls back when level pricing disabled', () => {
    const item = {
      base_price: 100,
      sell_price: 200,
      base_unit: 'pcs',
      unit: { name: 'pcs' },
      package_conversions: [],
      is_level_pricing_active: false,
      customer_level_discounts: [
        { customer_level_id: 'lvl1', discount_percentage: 20 },
      ],
    } as Item;

    const result = calculatePriceForCustomer({
      item,
      customerLevel: { id: 'lvl1', price_percentage: 50 } as CustomerLevel,
    });

    expect(result.levelPercentage).toBe(100);
    expect(result.itemDiscountPercentage).toBe(0);
  });

  it('merges classnames with tailwind merge', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
