import { describe, expect, it } from 'vite-plus/test';
import {
  appendBaselineDraft,
  buildBaselineDrafts,
  buildBaselineUpdates,
  getBaselineCreateState,
  getBaselineDiscount,
  getBaselinePlaceholderName,
  getIsBaselineAddActive,
  getIsLevelPricingSwitchChecked,
  getPricingSectionTitle,
  normalizeDiscount,
  parseDiscountInput,
  removeBaselineDraft,
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

  it('updates baseline drafts immutably after create and delete actions', () => {
    const drafts = {
      regular: '0',
      vip: '15',
    };

    expect(appendBaselineDraft(drafts, 'reseller', 12.5)).toEqual({
      regular: '0',
      vip: '15',
      reseller: '12.5',
    });
    expect(removeBaselineDraft(drafts, 'vip')).toEqual({
      regular: '0',
    });
    expect(removeBaselineDraft(drafts, 'missing')).toBe(drafts);
  });

  it('derives pricing form header and baseline active states', () => {
    expect(getPricingSectionTitle(false)).toBe('Unit & Harga Dasar');
    expect(getPricingSectionTitle(true)).toBe('Pengaturan Level Pelanggan');

    expect(
      getIsBaselineAddActive({
        baselineAddOpen: true,
        canCreateBaselineLevel: true,
        disabled: false,
        isCreating: false,
      })
    ).toBe(true);
    expect(
      getIsBaselineAddActive({
        baselineAddOpen: true,
        canCreateBaselineLevel: true,
        disabled: false,
        isCreating: true,
      })
    ).toBe(false);
  });

  it('keeps level pricing switch fallback order', () => {
    expect(
      getIsLevelPricingSwitchChecked({
        formIsLevelPricingActive: false,
        isLevelPricingActive: true,
      })
    ).toBe(true);
    expect(
      getIsLevelPricingSwitchChecked({
        formIsLevelPricingActive: false,
        isLevelPricingActive: undefined,
      })
    ).toBe(false);
    expect(
      getIsLevelPricingSwitchChecked({
        formIsLevelPricingActive: undefined,
        isLevelPricingActive: undefined,
      })
    ).toBe(true);
  });
});
