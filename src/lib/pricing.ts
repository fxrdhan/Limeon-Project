import type {
  CustomerLevel,
  CustomerLevelDiscount,
  Item,
  PackageConversion,
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

const resolveUnitConversion = (
  conversions: PackageConversion[],
  unitId?: string | null,
  unitName?: string | null
) => {
  if (!conversions.length) return null;

  if (unitId) {
    const byId = conversions.find(
      conversion => conversion.to_unit_id === unitId
    );
    if (byId) return byId;
  }

  if (unitName) {
    return (
      conversions.find(
        conversion =>
          conversion.unit_name?.toLowerCase() === unitName.toLowerCase()
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
  const conversions = Array.isArray(item.package_conversions)
    ? item.package_conversions
    : [];
  const conversion = resolveUnitConversion(conversions, unitId, unitName);

  if (conversion) {
    return {
      unitName: conversion.unit_name || item.base_unit || item.unit?.name || '',
      basePrice: normalizeNumber(conversion.base_price),
      baseSellPrice: normalizeNumber(conversion.sell_price),
      conversionRate: normalizeNumber(conversion.conversion_rate),
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

  const levelPercentage =
    normalizeNumber(customerLevel?.price_percentage) || 100;
  const levelPrice = resolved.baseSellPrice * (levelPercentage / 100);

  const itemDiscountPercentage = getItemDiscountForLevel(
    item.customer_level_discounts,
    customerLevel?.id
  );
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
