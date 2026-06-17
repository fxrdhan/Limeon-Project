import type {
  DBPackageConversion,
  InventoryUnitKind,
  ItemInventoryUnit,
  PackageConversion,
} from '@/types/database';

type ObjectRecord = Record<string, unknown>;

const INVENTORY_UNIT_KINDS: InventoryUnitKind[] = [
  'packaging',
  'retail_unit',
  'custom',
];

const isObjectRecord = (value: unknown): value is ObjectRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const readPositiveNumber = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0
    ? numericValue
    : null;
};

const readNonNegativeNumber = (value: unknown) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0
    ? numericValue
    : null;
};

const readNullableNonNegativeNumber = (value: unknown) => {
  if (value == null) return null;
  return readNonNegativeNumber(value);
};

const readInventoryUnitKind = (value: unknown): InventoryUnitKind =>
  INVENTORY_UNIT_KINDS.includes(value as InventoryUnitKind)
    ? (value as InventoryUnitKind)
    : 'custom';

const readPackageConversionRows = (rawValue: unknown): unknown[] | null => {
  if (rawValue == null) {
    return [];
  }

  if (typeof rawValue === 'string') {
    try {
      const parsedValue: unknown = JSON.parse(rawValue);
      return Array.isArray(parsedValue) ? parsedValue : null;
    } catch {
      return null;
    }
  }

  return Array.isArray(rawValue) ? rawValue : null;
};

const normalizeInventoryUnit = (
  rawUnit: unknown,
  fallbackId: string,
  fallbackName: string
): ItemInventoryUnit => {
  if (!isObjectRecord(rawUnit)) {
    return {
      id: fallbackId,
      name: fallbackName || 'Unknown Unit',
      kind: 'custom',
    };
  }

  return {
    id: readString(rawUnit.id) || fallbackId,
    code: readString(rawUnit.code) || undefined,
    name: readString(rawUnit.name) || fallbackName || 'Unknown Unit',
    kind: readInventoryUnitKind(rawUnit.kind),
    source_package_id:
      rawUnit.source_package_id == null
        ? null
        : readString(rawUnit.source_package_id) || null,
    source_dosage_id:
      rawUnit.source_dosage_id == null
        ? null
        : readString(rawUnit.source_dosage_id) || null,
    description:
      rawUnit.description == null
        ? null
        : readString(rawUnit.description) || null,
  };
};

const normalizePackageConversionRow = (
  rawRow: unknown
): PackageConversion | null => {
  if (!isObjectRecord(rawRow)) {
    return null;
  }

  const rawUnit = isObjectRecord(rawRow.unit) ? rawRow.unit : null;
  const unitId =
    readString(rawRow.inventory_unit_id) ||
    readString(rawRow.to_unit_id) ||
    readString(rawUnit?.id);
  const unitName = readString(rawRow.unit_name) || readString(rawUnit?.name);
  const factorToBase =
    readPositiveNumber(rawRow.factor_to_base) ||
    readPositiveNumber(rawRow.conversion_rate) ||
    readPositiveNumber(rawRow.contains_quantity);

  if ((!unitId && !unitName) || factorToBase === null) {
    return null;
  }

  const containsQuantity =
    readPositiveNumber(rawRow.contains_quantity) ?? factorToBase;
  const basePriceOverride = readNullableNonNegativeNumber(
    rawRow.base_price_override
  );
  const sellPriceOverride = readNullableNonNegativeNumber(
    rawRow.sell_price_override
  );

  return {
    id:
      readString(rawRow.id) ||
      unitId ||
      unitName ||
      `conversion-${factorToBase.toString()}`,
    unit_name: unitName,
    to_unit_id: readString(rawRow.to_unit_id) || unitId,
    inventory_unit_id: unitId,
    parent_inventory_unit_id:
      rawRow.parent_inventory_unit_id == null
        ? null
        : readString(rawRow.parent_inventory_unit_id) || null,
    contains_quantity: containsQuantity,
    factor_to_base: factorToBase,
    conversion_rate: factorToBase,
    base_price_override: basePriceOverride,
    sell_price_override: sellPriceOverride,
    unit: normalizeInventoryUnit(rawUnit, unitId, unitName),
    base_price: readNonNegativeNumber(rawRow.base_price) ?? 0,
    sell_price: readNonNegativeNumber(rawRow.sell_price) ?? 0,
  };
};

export const parsePackageConversionValue = (
  rawValue: unknown
): PackageConversion[] | null => {
  const rows = readPackageConversionRows(rawValue);
  if (rows === null) {
    return null;
  }

  if (rows.length === 0) {
    return [];
  }

  const conversions = rows.flatMap(row => {
    const conversion = normalizePackageConversionRow(row);
    return conversion ? [conversion] : [];
  });

  return conversions.length > 0 ? conversions : null;
};

export const normalizePackageConversions = (
  rawValue: unknown
): PackageConversion[] => parsePackageConversionValue(rawValue) ?? [];

const toDBPackageConversion = (
  conversion: PackageConversion
): DBPackageConversion => {
  const dbConversion: DBPackageConversion = {
    id: conversion.id,
    unit_name: conversion.unit_name,
    to_unit_id: conversion.to_unit_id,
    conversion_rate: conversion.conversion_rate,
  };

  if (conversion.base_price > 0) {
    dbConversion.base_price = conversion.base_price;
  }

  if (conversion.sell_price > 0) {
    dbConversion.sell_price = conversion.sell_price;
  }

  return dbConversion;
};

export const parseDBPackageConversionValue = (
  rawValue: unknown
): DBPackageConversion[] | null => {
  const conversions = parsePackageConversionValue(rawValue);
  return conversions ? conversions.map(toDBPackageConversion) : conversions;
};

export const normalizeDBPackageConversions = (
  rawValue: unknown
): DBPackageConversion[] => parseDBPackageConversionValue(rawValue) ?? [];

export const areDBPackageConversionValuesEqual = (
  nextValue: unknown,
  prevValue: unknown
) => {
  const nextConversions = parseDBPackageConversionValue(nextValue);
  const prevConversions = parseDBPackageConversionValue(prevValue);

  if (nextConversions === null || prevConversions === null) {
    return nextConversions === prevConversions;
  }

  return JSON.stringify(nextConversions) === JSON.stringify(prevConversions);
};
