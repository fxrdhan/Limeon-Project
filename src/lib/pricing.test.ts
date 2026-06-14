import { describe, expect, it } from 'vite-plus/test';
import {
  calculatePriceForCustomer,
  getItemDiscountForLevel,
  resolveUnitPrice,
} from './pricing';
import type { CustomerLevel } from '../types/database';

type PricingItem = Parameters<typeof calculatePriceForCustomer>[0]['item'];

const item = (overrides: Partial<PricingItem> = {}): PricingItem => ({
  base_price: 1000,
  base_unit: 'Tablet',
  customer_level_discounts: [],
  inventory_units: [],
  is_level_pricing_active: true,
  sell_price: 1500,
  unit: {
    name: 'Tablet',
  },
  ...overrides,
});

const customerLevel = (
  overrides: Partial<CustomerLevel> = {}
): CustomerLevel => ({
  id: 'level-grosir',
  level_name: 'Grosir',
  price_percentage: 90,
  ...overrides,
});

describe('pricing helpers', () => {
  it('resolves base item pricing when no inventory unit matches', () => {
    expect(resolveUnitPrice(item(), null, null)).toEqual({
      basePrice: 1000,
      baseSellPrice: 1500,
      conversionRate: 1,
      unitName: 'Tablet',
    });
  });

  it('resolves inventory-unit override pricing before fallback conversion pricing', () => {
    const pricedItem = item({
      inventory_units: [
        {
          factor_to_base: 12,
          id: 'hierarchy-box',
          contains_quantity: 12,
          inventory_unit_id: 'unit-box',
          unit: {
            id: 'unit-box',
            kind: 'packaging',
            name: 'Box',
          },
          base_price: 11000,
          base_price_override: null,
          sell_price: 18000,
          sell_price_override: 17500,
        },
      ],
    });

    expect(resolveUnitPrice(pricedItem, 'unit-box', null)).toEqual({
      basePrice: 11000,
      baseSellPrice: 17500,
      conversionRate: 12,
      unitName: 'Box',
    });
  });

  it('finds item-level customer discounts by customer level id', () => {
    expect(
      getItemDiscountForLevel(
        [
          {
            customer_level_id: 'level-regular',
            discount_percentage: 2,
          },
          {
            customer_level_id: 'level-grosir',
            discount_percentage: 5,
          },
        ],
        'level-grosir'
      )
    ).toBe(5);

    expect(getItemDiscountForLevel(undefined, 'level-grosir')).toBe(0);
  });

  it('calculates level pricing and item discounts for customers', () => {
    expect(
      calculatePriceForCustomer({
        customerLevel: customerLevel(),
        item: item({
          customer_level_discounts: [
            {
              customer_level_id: 'level-grosir',
              discount_percentage: 10,
            },
          ],
        }),
      })
    ).toMatchObject({
      basePrice: 1000,
      baseSellPrice: 1500,
      finalPrice: 1215,
      itemDiscountPercentage: 10,
      levelPercentage: 90,
      levelPrice: 1350,
      unitName: 'Tablet',
    });
  });

  it('ignores customer level pricing when level pricing is disabled on the item', () => {
    expect(
      calculatePriceForCustomer({
        customerLevel: customerLevel({
          price_percentage: 80,
        }),
        item: item({
          customer_level_discounts: [
            {
              customer_level_id: 'level-grosir',
              discount_percentage: 50,
            },
          ],
          is_level_pricing_active: false,
        }),
      })
    ).toMatchObject({
      finalPrice: 1500,
      itemDiscountPercentage: 0,
      levelPercentage: 100,
      levelPrice: 1500,
    });
  });
});
