import { useCallback } from 'react';
import type {
  UnitConversion,
  UnitData,
  UnitConversionLogicFormData,
} from '../../../shared/types';

interface UseUnitConversionLogicProps {
  conversions: UnitConversion[];
  availableUnits: UnitData[];
  formData: UnitConversionLogicFormData;
  addUnitConversion: (
    conversion: Omit<UnitConversion, 'id'> & {
      basePrice?: number;
      sellPrice?: number;
    }
  ) => void;
  setFormData: (data: UnitConversionLogicFormData) => void;
}

interface UseUnitConversionLogicPropsExtended
  extends UseUnitConversionLogicProps {
  baseUnit?: string;
}

export const useUnitConversionLogic = ({
  conversions,
  availableUnits,
  formData,
  addUnitConversion,
  setFormData,
  baseUnit,
}: UseUnitConversionLogicPropsExtended) => {
  const validateAndAddConversion = useCallback(() => {
    // Validate unit selection
    if (!formData.unit) {
      return { success: false, error: 'Silakan pilih satuan!' };
    }

    // Validate conversion value
    if (formData.conversion <= 0) {
      return { success: false, error: 'Nilai konversi harus lebih dari 0!' };
    }

    // Check if selected unit is the same as base unit
    if (baseUnit && formData.unit === baseUnit) {
      return {
        success: false,
        error: 'Satuan turunan tidak boleh sama dengan satuan utama!',
      };
    }

    // Check for duplicate units
    const existingUnit = conversions.find(uc => uc.unit.name === formData.unit);
    if (existingUnit) {
      return {
        success: false,
        error: 'Satuan tersebut sudah ada dalam daftar!',
      };
    }

    // Find selected unit details
    const selectedUnit = availableUnits.find(u => u.name === formData.unit);
    if (!selectedUnit) {
      return { success: false, error: 'Satuan tidak valid!' };
    }

    // Add the conversion
    addUnitConversion({
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
    addUnitConversion,
    setFormData,
    baseUnit,
  ]);

  return {
    validateAndAddConversion,
  };
};
