import { describe, expect, it } from 'vite-plus/test';
import type {
  CustomerLevelDiscount,
  ItemInventoryUnit,
} from '../../../types/database';
import {
  buildCustomerLevelDiscountInsertPayload,
  buildItemUnitHierarchyInsertPayload,
  toItemUnitHierarchyEntry,
} from './itemDataMappers';

const inventoryUnit = (
  overrides: Partial<ItemInventoryUnit> = {}
): ItemInventoryUnit => ({
  id: 'unit-1',
  name: 'Box',
  kind: 'packaging',
  ...overrides,
});

describe('item data mappers', () => {
  it('maps joined hierarchy entries with single and array unit relations', () => {
    const unit = inventoryUnit({ id: 'unit-1', name: 'Box' });
    const parentUnit = inventoryUnit({
      id: 'unit-parent',
      name: 'Carton',
    });

    expect(
      toItemUnitHierarchyEntry({
        id: 'hierarchy-1',
        item_id: 'item-1',
        inventory_unit_id: 'unit-1',
        parent_inventory_unit_id: 'unit-parent',
        contains_quantity: 10,
        factor_to_base: 10,
        base_price_override: 12000,
        sell_price_override: 15000,
        inventory_unit: [unit],
        parent_unit: parentUnit,
      })
    ).toEqual({
      id: 'hierarchy-1',
      item_id: 'item-1',
      inventory_unit_id: 'unit-1',
      parent_inventory_unit_id: 'unit-parent',
      contains_quantity: 10,
      factor_to_base: 10,
      base_price_override: 12000,
      sell_price_override: 15000,
      unit,
      parent_unit: parentUnit,
      base_price: 12000,
      sell_price: 15000,
    });
  });

  it('falls back to a custom unit and zero prices when joins and overrides are missing', () => {
    expect(
      toItemUnitHierarchyEntry({
        id: 'hierarchy-2',
        item_id: null,
        inventory_unit_id: 'missing-unit',
        parent_inventory_unit_id: null,
        contains_quantity: 1,
        factor_to_base: 1,
        inventory_unit: null,
        parent_unit: [],
      })
    ).toEqual({
      id: 'hierarchy-2',
      item_id: undefined,
      inventory_unit_id: 'missing-unit',
      parent_inventory_unit_id: null,
      contains_quantity: 1,
      factor_to_base: 1,
      base_price_override: undefined,
      sell_price_override: undefined,
      unit: {
        id: 'missing-unit',
        name: '',
        kind: 'custom',
      },
      parent_unit: null,
      base_price: 0,
      sell_price: 0,
    });
  });

  it('builds customer level discount insert payloads', () => {
    const discounts: CustomerLevelDiscount[] = [
      {
        customer_level_id: 'level-1',
        discount_percentage: 5,
      },
      {
        customer_level_id: 'level-2',
        discount_percentage: 10,
      },
    ];

    expect(
      buildCustomerLevelDiscountInsertPayload('item-1', discounts)
    ).toEqual([
      {
        item_id: 'item-1',
        customer_level_id: 'level-1',
        discount_percentage: 5,
      },
      {
        item_id: 'item-1',
        customer_level_id: 'level-2',
        discount_percentage: 10,
      },
    ]);
  });

  it('normalizes nullable hierarchy insert payload fields', () => {
    expect(
      buildItemUnitHierarchyInsertPayload('item-1', [
        {
          inventory_unit_id: 'unit-1',
          contains_quantity: 1,
          factor_to_base: 1,
        },
        {
          inventory_unit_id: 'unit-2',
          parent_inventory_unit_id: 'unit-1',
          contains_quantity: 10,
          factor_to_base: 10,
          base_price_override: 12000,
          sell_price_override: 15000,
        },
      ])
    ).toEqual([
      {
        item_id: 'item-1',
        inventory_unit_id: 'unit-1',
        parent_inventory_unit_id: null,
        contains_quantity: 1,
        factor_to_base: 1,
        base_price_override: null,
        sell_price_override: null,
      },
      {
        item_id: 'item-1',
        inventory_unit_id: 'unit-2',
        parent_inventory_unit_id: 'unit-1',
        contains_quantity: 10,
        factor_to_base: 10,
        base_price_override: 12000,
        sell_price_override: 15000,
      },
    ]);
  });
});
