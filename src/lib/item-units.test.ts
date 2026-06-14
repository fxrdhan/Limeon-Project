import { describe, expect, it } from 'vite-plus/test';
import {
  calculateFactorToBase,
  calculateUnitPricesFromBase,
  createInventoryUnitFromDosage,
  getBaseItemUnit,
  getInventoryUnitMetaLabel,
  getItemUnitOptions,
  mergeInventoryUnitsWithDosagePreference,
  resolveItemUnitEntry,
  sortItemUnits,
} from './item-units';
import type { ItemInventoryUnit, ItemUnitHierarchyEntry } from '../types';

const hierarchyUnit = (
  overrides: Partial<ItemUnitHierarchyEntry> = {}
): ItemUnitHierarchyEntry =>
  ({
    factor_to_base: 1,
    inventory_unit_id: 'unit-tablet',
    unit: {
      id: 'unit-tablet',
      kind: 'retail_unit',
      name: 'Tablet',
    },
    ...overrides,
  }) as ItemUnitHierarchyEntry;

const inventoryUnit = (
  overrides: Partial<ItemInventoryUnit> = {}
): ItemInventoryUnit =>
  ({
    id: 'unit-tablet',
    kind: 'custom',
    name: 'Tablet',
    source_dosage_id: null,
    source_package_id: null,
    ...overrides,
  }) as ItemInventoryUnit;

describe('item unit utilities', () => {
  it('sorts hierarchy entries and resolves the base unit', () => {
    const baseUnit = hierarchyUnit({
      factor_to_base: 1,
      inventory_unit_id: 'unit-tablet',
      unit: {
        id: 'unit-tablet',
        kind: 'retail_unit',
        name: 'Tablet',
      },
    });
    const boxUnit = hierarchyUnit({
      factor_to_base: 10,
      inventory_unit_id: 'unit-box',
      unit: {
        id: 'unit-box',
        kind: 'packaging',
        name: 'Box',
      },
    });

    expect(sortItemUnits([boxUnit, baseUnit])).toEqual([baseUnit, boxUnit]);
    expect(
      getBaseItemUnit({
        inventory_units: [boxUnit, baseUnit],
        unit: null,
      })
    ).toBe(baseUnit);
  });

  it('resolves hierarchy entries by id before falling back to case-insensitive names', () => {
    const units = [
      hierarchyUnit({
        inventory_unit_id: 'unit-tablet',
        unit: {
          id: 'unit-tablet',
          kind: 'retail_unit',
          name: 'Tablet',
        },
      }),
      hierarchyUnit({
        inventory_unit_id: 'unit-strip',
        unit: {
          id: 'unit-strip',
          kind: 'packaging',
          name: 'Strip',
        },
      }),
    ];

    expect(resolveItemUnitEntry(units, 'unit-strip', 'Tablet')).toBe(units[1]);
    expect(resolveItemUnitEntry(units, null, 'tablet')).toBe(units[0]);
    expect(resolveItemUnitEntry(units, null, 'Botol')).toBeNull();
  });

  it('builds unit options from hierarchy entries or item fallback fields', () => {
    expect(
      getItemUnitOptions({
        base_inventory_unit_id: 'unit-tablet',
        inventory_units: [
          hierarchyUnit({
            factor_to_base: 12,
            inventory_unit_id: 'unit-box',
            unit: {
              id: 'unit-box',
              kind: 'packaging',
              name: 'Box',
            },
          }),
        ],
        unit: null,
      })
    ).toEqual([
      {
        factorToBase: 12,
        id: 'unit-box',
        kind: 'packaging',
        name: 'Box',
      },
    ]);

    expect(
      getItemUnitOptions({
        base_inventory_unit_id: null,
        inventory_units: [],
        unit: {
          name: 'Ampul',
        },
      })
    ).toEqual([
      {
        factorToBase: 1,
        id: 'Ampul',
        kind: 'custom',
        name: 'Ampul',
      },
    ]);
  });

  it('calculates prices and factors from base unit relationships', () => {
    expect(
      calculateUnitPricesFromBase(
        {
          base_price_override: null,
          factor_to_base: 12,
          sell_price_override: 18000,
        },
        1000,
        2000
      )
    ).toEqual({
      basePrice: 12000,
      sellPrice: 18000,
    });

    expect(
      calculateFactorToBase(
        'unit-box',
        'unit-strip',
        10,
        [
          {
            factor_to_base: 12,
            inventory_unit_id: 'unit-strip',
          },
        ],
        'unit-tablet'
      )
    ).toBe(120);
  });

  it('creates dosage-backed inventory units and labels inventory metadata', () => {
    const dosageUnit = createInventoryUnitFromDosage({
      id: 'dosage-tablet',
      name: 'Tablet',
    });

    expect(dosageUnit).toMatchObject({
      id: 'dosage:dosage-tablet',
      kind: 'retail_unit',
      name: 'Tablet',
      source_dosage_id: 'dosage-tablet',
    });
    expect(createInventoryUnitFromDosage(null)).toBeNull();
    expect(
      getInventoryUnitMetaLabel({
        kind: dosageUnit!.kind,
        source_dosage_id: dosageUnit!.source_dosage_id,
        source_package_id: dosageUnit!.source_package_id,
      })
    ).toBe('Sediaan');
    expect(
      getInventoryUnitMetaLabel({
        kind: 'packaging',
        source_dosage_id: null,
        source_package_id: 'package-box',
      })
    ).toBe('Kemasan');
    expect(
      getInventoryUnitMetaLabel({
        kind: 'retail_unit',
        source_dosage_id: null,
        source_package_id: null,
      })
    ).toBe('Ecer');
  });

  it('promotes matching custom units to dosage-backed units without duplicating linked dosage units', () => {
    const plainTablet = inventoryUnit({
      id: 'custom-tablet',
      kind: 'custom',
      name: 'Tablet',
    });
    const capsule = inventoryUnit({
      id: 'custom-capsule',
      kind: 'custom',
      name: 'Capsule',
    });
    const dosageTablet = inventoryUnit({
      id: 'dosage-tablet',
      kind: 'retail_unit',
      name: 'Tablet',
      source_dosage_id: 'dosage-tablet',
    });

    expect(
      mergeInventoryUnitsWithDosagePreference(
        [plainTablet, capsule],
        dosageTablet
      )
    ).toEqual([
      {
        ...plainTablet,
        description: null,
        kind: 'retail_unit',
        source_dosage_id: 'dosage-tablet',
      },
      capsule,
    ]);

    expect(
      mergeInventoryUnitsWithDosagePreference(
        [plainTablet, dosageTablet],
        dosageTablet
      )
    ).toEqual([dosageTablet]);
  });
});
