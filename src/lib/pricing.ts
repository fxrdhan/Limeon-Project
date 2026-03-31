import type {
  CustomerLevel,
  CustomerLevelDiscount,
  Item,
  ItemUnitHierarchyEntry,
} from '@/types/database';

export interface PricingContext {
  item: Item;
  customerLevel?: CustomerLevel | null;
  unitName?: string | null;
  unitId?: string | null;
}

export interface PricingResult {
  unitName: string;
  basePrice: number;
  baseSellPrice: number;
  levelPercentage: number;
  levelPrice: number;
  itemDiscountPercentage: number;
  finalPrice: number;
}

const normalizeNumber = (value: number | string | null | undefined) =>
  Number(value) || 0;

const resolveInventoryUnit = (
  units: ItemUnitHierarchyEntry[],
  unitId?: string | null,
  unitName?: string | null
) => {
  if (!units.length) return null;

  if (unitId) {
    const byId = units.find(unit => unit.inventory_unit_id === unitId);
    if (byId) return byId;
  }

  if (unitName) {
    return (
      units.find(
        unit => unit.unit.name?.toLowerCase() === unitName.toLowerCase()
      ) || null
    );
  }

  return null;
};

export const getItemDiscountForLevel = (
  discounts: CustomerLevelDiscount[] | undefined,
  customerLevelId?: string | null
) => {
  if (!customerLevelId || !Array.isArray(discounts)) return 0;
  const match = discounts.find(
    discount => discount.customer_level_id === customerLevelId
  );
  return normalizeNumber(match?.discount_percentage);
};

export const resolveUnitPrice = (
  item: Item,
  unitId?: string | null,
  unitName?: string | null
) => {
  const inventoryUnits = Array.isArray(item.inventory_units)
    ? item.inventory_units
    : [];
  const resolvedUnit = resolveInventoryUnit(inventoryUnits, unitId, unitName);

  if (resolvedUnit) {
    const factorToBase = normalizeNumber(resolvedUnit.factor_to_base) || 1;
    const fallbackBasePrice =
      normalizeNumber(item.base_price) > 0
        ? normalizeNumber(item.base_price) * factorToBase
        : 0;
    const fallbackSellPrice =
      normalizeNumber(item.sell_price) > 0
        ? normalizeNumber(item.sell_price) * factorToBase
        : 0;

    return {
      unitName:
        resolvedUnit.unit.name || item.base_unit || item.unit?.name || '',
      basePrice:
        normalizeNumber(
          resolvedUnit.base_price_override ?? resolvedUnit.base_price
        ) || fallbackBasePrice,
      baseSellPrice:
        normalizeNumber(
          resolvedUnit.sell_price_override ?? resolvedUnit.sell_price
        ) || fallbackSellPrice,
      conversionRate: factorToBase,
    };
  }

  return {
    unitName: unitName || item.base_unit || item.unit?.name || '',
    basePrice: normalizeNumber(item.base_price),
    baseSellPrice: normalizeNumber(item.sell_price),
    conversionRate: 1,
  };
};

export const calculatePriceForCustomer = (
  context: PricingContext
): PricingResult => {
  const { item, customerLevel, unitId, unitName } = context;
  const resolved = resolveUnitPrice(item, unitId, unitName);

  const isLevelPricingActive = item.is_level_pricing_active !== false;

  const levelPercentage = isLevelPricingActive
    ? normalizeNumber(customerLevel?.price_percentage) || 100
    : 100;
  const levelPrice = resolved.baseSellPrice * (levelPercentage / 100);

  const itemDiscountPercentage = isLevelPricingActive
    ? getItemDiscountForLevel(item.customer_level_discounts, customerLevel?.id)
    : 0;
  const finalPrice = levelPrice * (1 - itemDiscountPercentage / 100);

  return {
    unitName: resolved.unitName,
    basePrice: resolved.basePrice,
    baseSellPrice: resolved.baseSellPrice,
    levelPercentage,
    levelPrice,
    itemDiscountPercentage,
    finalPrice,
  };
};
