import { useCallback } from 'react';
import type {
  PackageConversion,
  PackageConversionLogicFormData,
} from '../../../shared/types';
import type { UnitData } from '@/types/database';

interface UsePackageConversionLogicProps {
  conversions: PackageConversion[];
  availableUnits: UnitData[];
  formData: PackageConversionLogicFormData;
  addPackageConversion: (
    conversion: Omit<PackageConversion, 'id'> & {
      basePrice?: number;
      sellPrice?: number;
    }
  ) => void;
  setFormData: (data: PackageConversionLogicFormData) => void;
}

interface UsePackageConversionLogicPropsExtended
  extends UsePackageConversionLogicProps {
  baseUnit?: string;
}

export const usePackageConversionLogic = ({
  conversions,
  availableUnits,
  formData,
  addPackageConversion,
  setFormData,
  baseUnit,
}: UsePackageConversionLogicPropsExtended) => {
  const validateAndAddConversion = useCallback(() => {
    // Validate unit selection
    if (!formData.unit) {
      return { success: false, error: 'Silakan pilih kemasan!' };
    }

    // Validate conversion value
    if (formData.conversion <= 0) {
      return { success: false, error: 'Nilai konversi harus lebih dari 0!' };
    }

    // Check if selected unit is the same as base unit
    if (baseUnit && formData.unit === baseUnit) {
      return {
        success: false,
        error: 'Kemasan turunan tidak boleh sama dengan kemasan utama!',
      };
    }

    // Check for duplicate units
    const existingUnit = conversions.find(uc => uc.unit.name === formData.unit);
    if (existingUnit) {
      return {
        success: false,
        error: 'Kemasan tersebut sudah ada dalam daftar!',
      };
    }

    // Find selected unit details
    const selectedUnit = availableUnits.find(u => u.name === formData.unit);
    if (!selectedUnit) {
      return { success: false, error: 'Kemasan tidak valid!' };
    }

    // Add the conversion
    addPackageConversion({
      unit: {
        id: selectedUnit.id,
        name: selectedUnit.name,
      },
      unit_name: selectedUnit.name,
      to_unit_id: selectedUnit.id,
      conversion: formData.conversion,
      basePrice: 0,
      sellPrice: 0,
      conversion_rate: formData.conversion,
    });

    // Reset form
    setFormData({
      unit: '',
      conversion: 0,
    });

    return { success: true };
  }, [
    conversions,
    availableUnits,
    formData,
    addPackageConversion,
    setFormData,
    baseUnit,
  ]);

  return {
    validateAndAddConversion,
  };
};
