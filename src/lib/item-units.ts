import type { Item, ItemInventoryUnit, ItemUnitHierarchyEntry } from '@/types';

const normalizeNumber = (value: number | string | null | undefined) =>
  Number(value) || 0;

export const sortItemUnits = (units: ItemUnitHierarchyEntry[]) =>
  [...units].sort((a, b) => a.factor_to_base - b.factor_to_base);

export const getBaseItemUnit = (item: Pick<Item, 'inventory_units' | 'unit'>) =>
  sortItemUnits(item.inventory_units || []).find(
    inventoryUnit => inventoryUnit.factor_to_base === 1
  ) || null;

export const resolveItemUnitEntry = (
  units: ItemUnitHierarchyEntry[],
  unitId?: string | null,
  unitName?: string | null
) => {
  if (unitId) {
    const matchedById = units.find(
      inventoryUnit => inventoryUnit.inventory_unit_id === unitId
    );
    if (matchedById) return matchedById;
  }

  if (unitName) {
    return (
      units.find(
        inventoryUnit =>
          inventoryUnit.unit.name.toLowerCase() === unitName.toLowerCase()
      ) || null
    );
  }

  return null;
};

export const getItemUnitOptions = (
  item: Pick<Item, 'inventory_units' | 'unit' | 'base_inventory_unit_id'>
) => {
  const units = sortItemUnits(item.inventory_units || []);
  if (units.length > 0) {
    return units.map(unit => ({
      id: unit.inventory_unit_id,
      name: unit.unit.name,
      kind: unit.unit.kind,
      factorToBase: unit.factor_to_base,
    }));
  }

  return [
    {
      id: item.base_inventory_unit_id || item.unit?.name || 'unit',
      name: item.unit?.name || 'Unit',
      kind: 'custom' as const,
      factorToBase: 1,
    },
  ];
};

export const calculateUnitPricesFromBase = (
  unit: Pick<
    ItemUnitHierarchyEntry,
    'factor_to_base' | 'base_price_override' | 'sell_price_override'
  >,
  basePrice: number,
  sellPrice: number
) => {
  const factorToBase = normalizeNumber(unit.factor_to_base) || 1;
  const resolvedBasePrice =
    unit.base_price_override != null
      ? normalizeNumber(unit.base_price_override)
      : normalizeNumber(basePrice) * factorToBase;
  const resolvedSellPrice =
    unit.sell_price_override != null
      ? normalizeNumber(unit.sell_price_override)
      : normalizeNumber(sellPrice) * factorToBase;

  return {
    basePrice: resolvedBasePrice,
    sellPrice: resolvedSellPrice,
  };
};

export const calculateFactorToBase = (
  inventoryUnitId: string,
  parentInventoryUnitId: string | null,
  containsQuantity: number,
  existingUnits: Array<{
    inventory_unit_id: string;
    factor_to_base: number;
  }>,
  baseInventoryUnitId: string
) => {
  if (inventoryUnitId === baseInventoryUnitId || !parentInventoryUnitId) {
    return 1;
  }

  const parentUnit = existingUnits.find(
    unit => unit.inventory_unit_id === parentInventoryUnitId
  );
  const parentFactor = parentUnit?.factor_to_base || 1;
  return parentFactor * (normalizeNumber(containsQuantity) || 1);
};

export const createInventoryUnitFromDosage = (
  dosage: { id: string; name: string } | null | undefined
): ItemInventoryUnit | null => {
  if (!dosage?.id || !dosage.name) return null;

  return {
    id: `dosage:${dosage.id}`,
    name: dosage.name,
    kind: 'retail_unit',
    source_dosage_id: dosage.id,
  };
};
