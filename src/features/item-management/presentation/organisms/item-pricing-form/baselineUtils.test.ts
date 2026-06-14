import { describe, expect, it } from 'vite-plus/test';
import {
  buildBaselineDrafts,
  buildBaselineUpdates,
  getBaselineCreateState,
  getBaselineDiscount,
  getBaselinePlaceholderName,
  normalizeDiscount,
  parseDiscountInput,
} from './baselineUtils';
import type { CustomerLevel } from '../../../../../types/database';

const level = (
  id: string,
  pricePercentage: number,
  name = id
): CustomerLevel => ({
  id,
  level_name: name,
  price_percentage: pricePercentage,
  description: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
});

describe('item pricing baseline utils', () => {
  it('parses and normalizes discount inputs', () => {
    expect(parseDiscountInput('12,5')).toBe(12.5);
    expect(parseDiscountInput('')).toBe(0);
    expect(normalizeDiscount(-10)).toBe(0);
    expect(normalizeDiscount(120)).toBe(100);
    expect(normalizeDiscount(Number.NaN)).toBe(0);
  });

  it('derives create state for baseline levels', () => {
    expect(getBaselineCreateState('12,5')).toEqual({
      parsedDiscount: 12.5,
      normalizedDiscount: 12.5,
      canCreate: true,
      pricePercentage: 87.5,
    });
    expect(getBaselineCreateState('abc')).toMatchObject({
      normalizedDiscount: 0,
      canCreate: false,
      pricePercentage: 100,
    });
    expect(getBaselineCreateState('')).toMatchObject({
      parsedDiscount: 0,
      canCreate: false,
      pricePercentage: 100,
    });
    expect(getBaselineCreateState('250')).toMatchObject({
      normalizedDiscount: 100,
      canCreate: true,
      pricePercentage: 0,
    });
  });

  it('builds drafts and placeholder names from existing levels', () => {
    const levels = [level('regular', 100), level('vip', 85)];

    expect(getBaselineDiscount(levels[1]!)).toBe(15);
    expect(buildBaselineDrafts(levels)).toEqual({
      regular: '0',
      vip: '15',
    });
    expect(getBaselinePlaceholderName(levels)).toBe('Level 3');
  });

  it('returns only changed baseline update payloads', () => {
    expect(
      buildBaselineUpdates([level('regular', 100), level('vip', 85)], {
        regular: '0',
        vip: '20',
      })
    ).toEqual([
      {
        id: 'vip',
        price_percentage: 80,
      },
    ]);
  });
});
