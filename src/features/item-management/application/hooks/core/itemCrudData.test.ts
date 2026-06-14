import { describe, expect, it } from 'vite-plus/test';
import { createItemFormDataDefaults } from '../form/itemFormStateHelpers';
import {
  getItemSubmitSelectableUnits,
  normalizeCachedItemFormData,
} from './itemCrudData';
import type { ItemDosageEntity } from '../../../shared/types';
import type { ItemInventoryUnit } from '../../../../../types/database';

const inventoryUnit = (
  id: string,
  name = id,
  overrides: Partial<ItemInventoryUnit> = {}
): ItemInventoryUnit => ({
  id,
  name,
  kind: 'packaging',
  ...overrides,
});

const dosage = (id: string, name = id): ItemDosageEntity => ({
  id,
  name,
});

describe('item crud data helpers', () => {
  it('normalizes cached form data fields used by the form on restore', () => {
    const formData = createItemFormDataDefaults({
      initialSearchQuery: 'cached item',
    });

    expect(
      normalizeCachedItemFormData({
        ...formData,
        base_inventory_unit_id: undefined,
        quantity: undefined,
        unit_id: undefined,
      })
    ).toMatchObject({
      name: 'cached item',
      base_inventory_unit_id: '',
      quantity: 0,
      unit_id: '',
    });

    expect(
      normalizeCachedItemFormData({
        ...formData,
        base_inventory_unit_id: null,
        quantity: null,
        unit_id: null,
      })
    ).toMatchObject({
      base_inventory_unit_id: '',
      quantity: 0,
      unit_id: '',
    });
  });

  it('keeps available units unchanged when no dosage-backed unit is selected', () => {
    const tablet = inventoryUnit('tablet', 'Tablet');
    const availableUnits = [tablet];

    expect(
      getItemSubmitSelectableUnits({
        availableUnits,
        dosageId: '',
        dosages: [dosage('caplet', 'Kaplet')],
      })
    ).toEqual(availableUnits);
  });

  it('adds the selected dosage-backed unit for submit validation', () => {
    const tablet = inventoryUnit('tablet', 'Tablet');

    expect(
      getItemSubmitSelectableUnits({
        availableUnits: [tablet],
        dosageId: 'caplet',
        dosages: [dosage('caplet', 'Kaplet')],
      })
    ).toEqual([
      tablet,
      {
        id: 'dosage:caplet',
        name: 'Kaplet',
        kind: 'retail_unit',
        source_dosage_id: 'caplet',
      },
    ]);
  });
});
