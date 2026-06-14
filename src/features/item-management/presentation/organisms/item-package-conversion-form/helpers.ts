import { getInventoryUnitMetaLabel } from '@/lib/item-units';
import type { ComboboxOption } from '@/types/components';
import type { ItemInventoryUnit } from '@/types/database';
import type { PackageConversion } from '../../../shared/types';

interface FilterAvailablePackageConversionUnitsOptions {
  availableUnits: ItemInventoryUnit[];
  baseUnitId: string;
  conversions: PackageConversion[];
}

interface ResolvePackageConversionParentUnitNameOptions {
  parentInventoryUnitId?: string | null;
  baseUnit: string;
  baseUnitId: string;
  availableUnits: ItemInventoryUnit[];
  conversions: PackageConversion[];
}

interface PackageConversionBaseUnitOptionOptions {
  baseUnit: string;
  baseUnitId: string;
  availableUnits: ItemInventoryUnit[];
}

export const parsePackageConversionCurrencyValue = (value: unknown) => {
  if (typeof value === 'number') return Math.max(0, value);
  if (typeof value === 'string') {
    const numeric = value.replace(/[^0-9]/g, '');
    const parsed = Number(numeric);
    return Math.max(0, Number.isNaN(parsed) ? 0 : parsed);
  }
  return 0;
};

const getPackageConversionUnitId = (conversion: PackageConversion) =>
  conversion.inventory_unit_id || conversion.to_unit_id || conversion.unit.id;

export const getFilteredAvailablePackageConversionUnits = ({
  availableUnits,
  baseUnitId,
  conversions,
}: FilterAvailablePackageConversionUnitsOptions) =>
  availableUnits
    .filter(unit => unit.id !== baseUnitId)
    .filter(
      unit =>
        !conversions.some(
          conversion => getPackageConversionUnitId(conversion) === unit.id
        )
    );

export const getUniquePackageConversions = (conversions: PackageConversion[]) =>
  conversions.filter(
    (conversion, index, self) =>
      Boolean(conversion.unit) &&
      index ===
        self.findIndex(
          candidate =>
            getPackageConversionUnitId(candidate) ===
            getPackageConversionUnitId(conversion)
        )
  );

export const resolvePackageConversionParentUnitName = ({
  parentInventoryUnitId,
  baseUnit,
  baseUnitId,
  availableUnits,
  conversions,
}: ResolvePackageConversionParentUnitNameOptions) => {
  if (!parentInventoryUnitId) {
    return baseUnit || 'Unit Dasar';
  }

  if (parentInventoryUnitId === baseUnitId) {
    return baseUnit || 'Unit Dasar';
  }

  const parentFromConversions = conversions.find(
    conversion =>
      getPackageConversionUnitId(conversion) === parentInventoryUnitId
  );
  if (parentFromConversions?.unit?.name) {
    return parentFromConversions.unit.name;
  }

  const parentFromAvailableUnits = availableUnits.find(
    unit => unit.id === parentInventoryUnitId
  );
  if (parentFromAvailableUnits?.name) {
    return parentFromAvailableUnits.name;
  }

  return baseUnit || 'Unit Dasar';
};

export const getPackageConversionBaseUnitOption = ({
  baseUnit,
  baseUnitId,
  availableUnits,
}: PackageConversionBaseUnitOptionOptions): ComboboxOption | null => {
  if (!baseUnitId) return null;

  const baseUnitDetail = availableUnits.find(unit => unit.id === baseUnitId);
  return {
    id: baseUnitId,
    name: baseUnit,
    code: baseUnitDetail?.code,
    description: baseUnitDetail?.description ?? undefined,
    updated_at: baseUnitDetail?.updated_at,
  };
};

export const getPackageConversionExistingUnitOptions = (
  conversions: PackageConversion[]
): ComboboxOption[] =>
  conversions.map(conversion => ({
    id: getPackageConversionUnitId(conversion),
    name: conversion.unit.name,
    code: conversion.unit.code,
    description: conversion.unit.description ?? undefined,
    updated_at: conversion.unit.updated_at,
    metaLabel: getInventoryUnitMetaLabel(conversion.unit),
  }));
