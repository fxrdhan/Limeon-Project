import { describe, expect, it } from 'vite-plus/test';
import { normalizeFormCacheData, parseFormCacheData } from './useFormCache';
import type { PackageConversion } from '../../types/database';
import type { FormData } from '../../types/forms';

const makeFormData = (overrides: Partial<FormData> = {}): FormData => ({
  code: 'ITEM-001',
  name: 'Paracetamol',
  manufacturer_id: 'manufacturer-1',
  type_id: 'type-1',
  category_id: 'category-1',
  package_id: 'package-1',
  base_inventory_unit_id: 'unit-base',
  dosage_id: 'dosage-1',
  barcode: '899',
  description: 'Cached item',
  base_price: 1000,
  sell_price: 1500,
  min_stock: 5,
  quantity: 0,
  unit_id: 'unit-legacy',
  is_active: true,
  is_medicine: true,
  has_expiry_date: false,
  ...overrides,
});

const makeConversion = (
  overrides: Partial<PackageConversion> = {}
): PackageConversion => ({
  id: 'conversion-1',
  unit_name: 'Box',
  to_unit_id: 'unit-box',
  inventory_unit_id: 'unit-box',
  parent_inventory_unit_id: null,
  contains_quantity: 10,
  factor_to_base: 10,
  base_price_override: null,
  sell_price_override: null,
  unit: {
    id: 'unit-box',
    code: 'BOX',
    name: 'Box',
    kind: 'packaging',
  },
  conversion_rate: 10,
  base_price: 10_000,
  sell_price: 15_000,
  ...overrides,
});

describe('form cache normalization', () => {
  it('returns null for empty, corrupt, or non-cache payloads', () => {
    expect(parseFormCacheData(null)).toBeNull();
    expect(parseFormCacheData('{invalid')).toBeNull();
    expect(normalizeFormCacheData({ conversions: [] })).toBeNull();
  });

  it('normalizes cached form values while preserving valid conversions', () => {
    const normalizedCache = normalizeFormCacheData({
      formData: {
        ...makeFormData(),
        base_price: '1000',
        is_active: 'yes',
        min_stock: '7',
        quantity: null,
      },
      conversions: [
        {
          ...makeConversion(),
          conversion_rate: '12',
          base_price: '12000',
          sell_price: '18000',
        },
      ],
    });

    expect(normalizedCache).toEqual({
      formData: makeFormData({
        base_price: 1000,
        is_active: true,
        min_stock: 7,
        quantity: 0,
      }),
      conversions: [
        makeConversion({
          conversion_rate: 12,
          base_price: 12_000,
          sell_price: 18_000,
        }),
      ],
    });
  });

  it('drops malformed conversions without discarding the form cache', () => {
    expect(
      normalizeFormCacheData({
        formData: makeFormData(),
        conversions: [
          makeConversion(),
          {
            id: 'invalid-conversion',
            unit_name: 'Broken',
          },
        ],
      })?.conversions
    ).toEqual([makeConversion()]);
  });
});
