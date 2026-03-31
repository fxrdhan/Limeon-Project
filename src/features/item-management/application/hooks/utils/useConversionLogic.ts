import { useCallback } from 'react';
import type {
  PackageConversion,
  PackageConversionLogicFormData,
} from '../../../shared/types';
import type { ItemInventoryUnit } from '@/types/database';
import { calculateFactorToBase } from '@/lib/item-units';

interface ConversionLogicProps {
  conversions: PackageConversion[];
  availableUnits: ItemInventoryUnit[];
  formData: PackageConversionLogicFormData;
  addPackageConversion: (
    conversion: Omit<PackageConversion, 'id' | 'base_price' | 'sell_price'> & {
      base_price?: number;
      sell_price?: number;
    }
  ) => void;
  setFormData: (data: PackageConversionLogicFormData) => void;
}

interface ConversionProps extends ConversionLogicProps {
  baseUnit?: string;
  baseInventoryUnitId?: string;
}

export const useConversionLogic = ({
  conversions,
  availableUnits,
  formData,
  addPackageConversion,
  setFormData,
  baseUnit,
  baseInventoryUnitId,
}: ConversionProps) => {
  const validateAndAddConversion = useCallback(() => {
    if (!formData.inventory_unit_id) {
      return { success: false, error: 'Silakan pilih unit!' };
    }

    if (!formData.parent_inventory_unit_id) {
      return { success: false, error: 'Silakan pilih unit parent!' };
    }

    if (formData.contains_quantity <= 0) {
      return { success: false, error: 'Isi unit harus lebih dari 0!' };
    }

    const selectedUnit = availableUnits.find(
      unit => unit.id === formData.inventory_unit_id
    );

    if (!selectedUnit) {
      return { success: false, error: 'Unit tidak valid!' };
    }

    if (
      formData.inventory_unit_id === formData.parent_inventory_unit_id &&
      formData.parent_inventory_unit_id !== ''
    ) {
      return {
        success: false,
        error: 'Unit tidak boleh berisi dirinya sendiri!',
      };
    }

    if (baseUnit && selectedUnit.name === baseUnit) {
      return {
        success: false,
        error: 'Unit baru tidak boleh sama dengan Unit Dasar!',
      };
    }

    const existingUnit = conversions.find(
      uc =>
        (uc.inventory_unit_id || uc.to_unit_id || uc.unit.id) ===
        formData.inventory_unit_id
    );
    if (existingUnit) {
      return {
        success: false,
        error: 'Unit tersebut sudah ada dalam struktur!',
      };
    }

    const factorToBase = calculateFactorToBase(
      formData.inventory_unit_id,
      formData.parent_inventory_unit_id,
      formData.contains_quantity,
      conversions.map(conversion => ({
        inventory_unit_id:
          conversion.inventory_unit_id || conversion.to_unit_id || '',
        factor_to_base:
          conversion.factor_to_base || conversion.conversion_rate || 1,
      })),
      baseInventoryUnitId || formData.parent_inventory_unit_id
    );

    addPackageConversion({
      unit: selectedUnit,
      unit_name: selectedUnit.name,
      to_unit_id: selectedUnit.id,
      inventory_unit_id: selectedUnit.id,
      parent_inventory_unit_id: formData.parent_inventory_unit_id,
      contains_quantity: formData.contains_quantity,
      factor_to_base: factorToBase,
      conversion_rate: factorToBase,
    });

    setFormData({
      inventory_unit_id: '',
      parent_inventory_unit_id: '',
      contains_quantity: 0,
    });

    return { success: true };
  }, [
    conversions,
    availableUnits,
    formData,
    addPackageConversion,
    setFormData,
    baseUnit,
    baseInventoryUnitId,
  ]);

  return {
    validateAndAddConversion,
  };
};
