import { describe, expect, it } from 'vite-plus/test';
import { prepareConversionsForSave } from './pendingPackageConversion';
import type {
  ItemInventoryUnit,
  PackageConversion,
} from '../../../../../types/database';

const unit = (id: string, name = id): ItemInventoryUnit => ({
  id,
  name,
  kind: 'packaging',
});

const conversion = (
  unitId: string,
  factorToBase: number
): PackageConversion => ({
  id: `conversion-${unitId}`,
  unit: unit(unitId),
  unit_name: unitId,
  to_unit_id: unitId,
  inventory_unit_id: unitId,
  parent_inventory_unit_id: null,
  contains_quantity: factorToBase,
  factor_to_base: factorToBase,
  conversion_rate: factorToBase,
  base_price: 0,
  sell_price: 0,
});

describe('prepareConversionsForSave', () => {
  it('keeps conversions unchanged when no pending conversion is complete', () => {
    const conversions = [conversion('box', 10)];

    const result = prepareConversionsForSave({
      conversions,
      pendingConversion: {
        inventory_unit_id: '',
        parent_inventory_unit_id: 'box',
        contains_quantity: 2,
      },
      selectableUnits: [unit('strip')],
      factorLookupUnits: [unit('box')],
      baseInventoryUnitId: 'tablet',
    });

    expect(result.conversions).toBe(conversions);
    expect(result.errorMessage).toBeUndefined();
  });

  it('reports an invalid unit without changing conversions', () => {
    const conversions = [conversion('box', 10)];

    const result = prepareConversionsForSave({
      conversions,
      pendingConversion: {
        inventory_unit_id: 'missing',
        parent_inventory_unit_id: 'box',
        contains_quantity: 2,
      },
      selectableUnits: [unit('strip')],
      factorLookupUnits: [unit('box')],
      baseInventoryUnitId: 'tablet',
    });

    expect(result.conversions).toBe(conversions);
    expect(result.errorMessage).toBe('Unit tidak valid!');
  });

  it('reports a unit matching the base inventory unit', () => {
    const result = prepareConversionsForSave({
      conversions: [],
      pendingConversion: {
        inventory_unit_id: 'tablet',
        parent_inventory_unit_id: 'box',
        contains_quantity: 2,
      },
      selectableUnits: [unit('tablet')],
      factorLookupUnits: [unit('box')],
      baseInventoryUnitId: 'tablet',
    });

    expect(result.errorMessage).toBe(
      'Unit tambahan tidak boleh sama dengan Unit Dasar!'
    );
  });

  it('reports a duplicate unit without changing conversions', () => {
    const conversions = [conversion('strip', 10)];

    const result = prepareConversionsForSave({
      conversions,
      pendingConversion: {
        inventory_unit_id: 'strip',
        parent_inventory_unit_id: 'box',
        contains_quantity: 2,
      },
      selectableUnits: [unit('strip')],
      factorLookupUnits: [unit('box')],
      baseInventoryUnitId: 'tablet',
    });

    expect(result.conversions).toBe(conversions);
    expect(result.errorMessage).toBe('Unit tersebut sudah ada dalam struktur!');
  });

  it('appends a pending conversion using the parent factor', () => {
    const conversions = [conversion('box', 10)];

    const result = prepareConversionsForSave({
      conversions,
      pendingConversion: {
        inventory_unit_id: 'strip',
        parent_inventory_unit_id: 'box',
        contains_quantity: 2,
      },
      selectableUnits: [unit('strip')],
      factorLookupUnits: [unit('box')],
      baseInventoryUnitId: 'tablet',
      idFactory: () => 'pending-strip',
    });

    expect(result.errorMessage).toBeUndefined();
    expect(result.conversions).toHaveLength(2);
    expect(result.conversions[1]).toEqual({
      id: 'pending-strip',
      unit: unit('strip'),
      unit_name: 'strip',
      to_unit_id: 'strip',
      inventory_unit_id: 'strip',
      parent_inventory_unit_id: 'box',
      contains_quantity: 2,
      factor_to_base: 20,
      conversion_rate: 20,
      base_price: 0,
      sell_price: 0,
    });
  });

  it('uses the pending quantity when parent is not in the factor lookup units', () => {
    const conversions = [conversion('box', 10)];

    const result = prepareConversionsForSave({
      conversions,
      pendingConversion: {
        inventory_unit_id: 'strip',
        parent_inventory_unit_id: 'box',
        contains_quantity: 2,
      },
      selectableUnits: [unit('strip'), unit('box')],
      factorLookupUnits: [],
      baseInventoryUnitId: 'tablet',
      idFactory: () => 'pending-strip',
    });

    expect(result.conversions[1]?.factor_to_base).toBe(2);
    expect(result.conversions[1]?.conversion_rate).toBe(2);
  });
});
