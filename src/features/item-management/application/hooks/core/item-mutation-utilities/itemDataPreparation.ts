import type { ItemFormData, PackageConversion } from '../../../../shared/types';

export const prepareItemData = async (
  formData: ItemFormData,
  conversions: PackageConversion[],
  baseUnit: string,
  baseInventoryUnitId: string,
  isUpdate: boolean = false
) => {
  const baseData = {
    name: formData.name,
    manufacturer_id: formData.manufacturer_id || null,
    category_id: formData.category_id,
    type_id: formData.type_id,
    package_id: formData.package_id,
    base_price: formData.base_price,
    sell_price: formData.sell_price,
    is_level_pricing_active:
      formData.is_level_pricing_active !== undefined
        ? formData.is_level_pricing_active
        : true,
    min_stock: formData.min_stock,
    description: formData.description || null,
    is_active: formData.is_active,
    dosage_id: formData.dosage_id || null,
    barcode: formData.barcode || null,
    code: formData.code,
    is_medicine: formData.is_medicine,
    base_inventory_unit_id: baseInventoryUnitId || null,
    base_unit: baseUnit,
    measurement_value: formData.quantity > 0 ? formData.quantity : null,
    measurement_unit_id: formData.unit_id || null,
    measurement_denominator_value:
      formData.measurement_denominator_value ?? null,
    measurement_denominator_unit_id:
      formData.measurement_denominator_unit_id || null,
    has_expiry_date: formData.has_expiry_date,
    image_urls: formData.image_urls || [],
    package_conversions: conversions.map(uc => ({
      unit_name: uc.unit.name,
      to_unit_id: uc.inventory_unit_id || uc.to_unit_id,
      conversion_rate: uc.factor_to_base || uc.conversion_rate,
      base_price: uc.base_price_override ?? uc.base_price,
      sell_price: uc.sell_price_override ?? uc.sell_price,
    })),
  };

  if (!isUpdate) {
    return { ...baseData, stock: 0 };
  }

  return baseData;
};
