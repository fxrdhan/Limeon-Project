import { describe, expect, it } from 'vite-plus/test';
import { createItemFormDataDefaults } from '../../form/itemFormStateHelpers';
import { prepareItemData } from './itemDataPreparation';
import type { PackageConversion } from '../../../../shared/types';

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
  contains_quantity: 10,
  factor_to_base: 10,
  base_price_override: 12_000,
  sell_price_override: 15_000,
  unit: unit(unitId),
  conversion_rate: 10,
  base_price: 10_000,
  sell_price: 14_000,
  ...overrides,
});

describe('prepareItemData', () => {
  it('builds create payloads with initial stock and normalized nullable fields', async () => {
    const payload = await prepareItemData(
      createItemFormDataDefaults({
        includeImageUrls: true,
        initialSearchQuery: 'Paracetamol',
      }),
      [conversion('box')],
      'Tablet',
      'unit-tablet',
      false
    );

    expect(payload).toMatchObject({
      name: 'Paracetamol',
      manufacturer_id: null,
      base_inventory_unit_id: 'unit-tablet',
      base_unit: 'Tablet',
      measurement_value: null,
      measurement_unit_id: null,
      stock: 0,
      package_conversions: [
        {
          unit_name: 'box',
          to_unit_id: 'box',
          conversion_rate: 10,
          base_price: 12_000,
          sell_price: 15_000,
        },
      ],
    });
  });

  it('builds update payloads without resetting stock', async () => {
    const payload = await prepareItemData(
      {
        ...createItemFormDataDefaults(),
        manufacturer_id: 'manufacturer-1',
        quantity: 30,
        unit_id: 'mg',
      },
      [conversion('strip', { base_price_override: null })],
      'Tablet',
      'unit-tablet',
      true
    );

    expect(Object.hasOwn(payload, 'stock')).toBe(false);
    expect(payload).toMatchObject({
      manufacturer_id: 'manufacturer-1',
      measurement_value: 30,
      measurement_unit_id: 'mg',
      package_conversions: [
        {
          unit_name: 'strip',
          to_unit_id: 'strip',
          conversion_rate: 10,
          base_price: 10_000,
          sell_price: 15_000,
        },
      ],
    });
  });
});
