import type { ItemFormData, PackageConversion } from '../../../shared/types';

interface CreateItemFormDataDefaultsOptions {
  initialSearchQuery?: string;
  includeImageUrls?: boolean;
}

interface HasItemFormStateChangedOptions {
  formData: ItemFormData;
  initialFormData: ItemFormData | null;
  currentConversions?: PackageConversion[];
  initialPackageConversions?: PackageConversion[] | null;
}

type ConversionForCompare = {
  inventory_unit_id: string;
  parent_inventory_unit_id: string | null;
  to_unit_id: string;
  conversion_rate: number;
  base_price_override: number | null;
  sell_price_override: number | null;
};

export const createItemFormDataDefaults = ({
  initialSearchQuery,
  includeImageUrls = true,
}: CreateItemFormDataDefaultsOptions = {}): ItemFormData => ({
  code: '',
  name: initialSearchQuery || '',
  manufacturer_id: '',
  type_id: '',
  category_id: '',
  package_id: '',
  base_inventory_unit_id: '',
  dosage_id: '',
  barcode: '',
  description: '',
  ...(includeImageUrls ? { image_urls: [] } : {}),
  base_price: 0,
  sell_price: 0,
  is_level_pricing_active: true,
  min_stock: 10,
  quantity: 0,
  unit_id: '',
  measurement_denominator_value: null,
  measurement_denominator_unit_id: '',
  is_active: true,
  is_medicine: true,
  has_expiry_date: false,
  updated_at: null,
  customer_level_discounts: [],
});

const mapConversionForComparison = (
  conversion: PackageConversion
): ConversionForCompare | null => {
  const unitId = conversion?.unit?.id || conversion?.to_unit_id;
  if (!conversion || !unitId) return null;

  return {
    inventory_unit_id:
      conversion.inventory_unit_id || conversion.to_unit_id || unitId,
    parent_inventory_unit_id: conversion.parent_inventory_unit_id || null,
    to_unit_id: unitId,
    conversion_rate:
      conversion.factor_to_base || conversion.conversion_rate || 1,
    base_price_override:
      conversion.base_price_override ?? conversion.base_price ?? null,
    sell_price_override:
      conversion.sell_price_override ?? conversion.sell_price ?? null,
  };
};

const getComparableConversions = (conversions: PackageConversion[] = []) =>
  conversions
    .map(mapConversionForComparison)
    .filter((conversion): conversion is ConversionForCompare =>
      Boolean(conversion)
    )
    .sort((a, b) => a.to_unit_id.localeCompare(b.to_unit_id));

export const hasItemFormStateChanged = ({
  formData,
  initialFormData,
  currentConversions = [],
  initialPackageConversions,
}: HasItemFormStateChangedOptions): boolean => {
  if (!initialFormData) return false;

  const formDataChanged =
    JSON.stringify(formData) !== JSON.stringify(initialFormData);
  const conversionsChanged =
    JSON.stringify(getComparableConversions(currentConversions)) !==
    JSON.stringify(
      getComparableConversions(
        Array.isArray(initialPackageConversions)
          ? initialPackageConversions
          : []
      )
    );

  return formDataChanged || conversionsChanged;
};
