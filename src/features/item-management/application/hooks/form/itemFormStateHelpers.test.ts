import { describe, expect, it } from 'vite-plus/test';
import {
  createItemFormDataDefaults,
  hasItemFormStateChanged,
} from './itemFormStateHelpers';
import type { ItemFormData, PackageConversion } from '../../../shared/types';

const unit = (id: string): PackageConversion['unit'] => ({
  id,
  name: id,
  kind: 'packaging',
});

const conversion = (
  unitId: string,
  overrides: Partial<PackageConversion> = {}
): PackageConversion => ({
  id: `conversion-${unitId}`,
  unit_name: unitId,
  to_unit_id: unitId,
  inventory_unit_id: unitId,
  parent_inventory_unit_id: null,
  contains_quantity: 1,
  factor_to_base: 1,
  base_price_override: null,
  sell_price_override: null,
  unit: unit(unitId),
  conversion_rate: 1,
  base_price: 0,
  sell_price: 0,
  ...overrides,
});

describe('item form state helpers', () => {
  it('creates item form defaults with the initial query and existing reset shape', () => {
    const defaults = createItemFormDataDefaults({
      initialSearchQuery: 'amoxicillin',
    });
    const resetDefaults = createItemFormDataDefaults({
      initialSearchQuery: 'amoxicillin',
      includeImageUrls: false,
    });

    expect(defaults.name).toBe('amoxicillin');
    expect(defaults.image_urls).toEqual([]);
    expect(defaults.min_stock).toBe(10);
    expect(defaults.customer_level_discounts).toEqual([]);
    expect(Object.hasOwn(defaults, 'image_urls')).toBe(true);
    expect(Object.hasOwn(resetDefaults, 'image_urls')).toBe(false);
  });

  it('detects changed form data only after an initial form snapshot exists', () => {
    const initialFormData = createItemFormDataDefaults();
    const changedFormData: ItemFormData = {
      ...initialFormData,
      name: 'Paracetamol',
    };

    expect(
      hasItemFormStateChanged({
        formData: changedFormData,
        initialFormData: null,
      })
    ).toBe(false);
    expect(
      hasItemFormStateChanged({
        formData: initialFormData,
        initialFormData,
      })
    ).toBe(false);
    expect(
      hasItemFormStateChanged({
        formData: changedFormData,
        initialFormData,
      })
    ).toBe(true);
  });

  it('compares package conversions by normalized unit values instead of array order', () => {
    const formData = createItemFormDataDefaults();

    expect(
      hasItemFormStateChanged({
        formData,
        initialFormData: formData,
        currentConversions: [
          conversion('strip', {
            factor_to_base: 10,
            base_price_override: 500,
            sell_price_override: 700,
          }),
          conversion('box', { factor_to_base: 100, conversion_rate: 100 }),
        ],
        initialPackageConversions: [
          conversion('box', { factor_to_base: 100, conversion_rate: 100 }),
          conversion('strip', {
            factor_to_base: undefined,
            conversion_rate: 10,
            base_price: 500,
            sell_price: 700,
          }),
        ],
      })
    ).toBe(false);
  });

  it('detects changed package conversion values', () => {
    const formData = createItemFormDataDefaults();

    expect(
      hasItemFormStateChanged({
        formData,
        initialFormData: formData,
        currentConversions: [conversion('strip', { sell_price: 800 })],
        initialPackageConversions: [conversion('strip', { sell_price: 700 })],
      })
    ).toBe(true);
  });
});
