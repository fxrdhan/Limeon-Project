import { useCallback } from 'react';
import type { ItemFormData, PackageConversion } from '../../../shared/types';
import type { ItemPackage } from '../../../domain/entities';

interface UseItemFormResetProps {
  formState: {
    resetForm: () => void;
    isEditMode: boolean;
    initialFormData: ItemFormData | null;
    initialPackageConversions: PackageConversion[] | null;
    units: ItemPackage[];
  };
  packageConversionHook: {
    resetConversions: () => void;
    setBaseUnit: (unit: string) => void;
    setBasePrice: (price: number) => void;
    setSellPrice: (price: number) => void;
    skipNextRecalculation: () => void;
    addPackageConversion: (conversion: PackageConversion) => void;
  };
  cache: {
    clearCache: () => void;
  };
}

/**
 * Hook for managing form reset operations
 * 
 * Handles:
 * - Form data reset
 * - Package conversion reset
 * - Edit vs Add mode reset logic
 * - Cache clearing
 */
export const useItemFormReset = ({
  formState,
  packageConversionHook,
  cache,
}: UseItemFormResetProps) => {

  const resetFormWrapper = useCallback(() => {
    formState.resetForm();

    if (
      formState.isEditMode &&
      formState.initialFormData &&
      formState.initialPackageConversions
    ) {
      // Reset unit conversions for edit mode
      packageConversionHook.resetConversions();
      const baseUnitName =
        formState.units.find(u => u.id === formState.initialFormData!.unit_id)
          ?.name || '';
      packageConversionHook.setBaseUnit(baseUnitName);
      packageConversionHook.setBasePrice(
        formState.initialFormData.base_price || 0
      );
      packageConversionHook.setSellPrice(
        formState.initialFormData.sell_price || 0
      );
      packageConversionHook.skipNextRecalculation();

      formState.initialPackageConversions.forEach(convDataFromDB => {
        const unitDetails = formState.units.find(
          u => u.name === convDataFromDB.unit_name
        );
        if (unitDetails && typeof convDataFromDB.conversion_rate === 'number') {
          packageConversionHook.addPackageConversion({
            id: convDataFromDB.id || `temp-${Date.now()}-${Math.random()}`,
            to_unit_id: unitDetails.id,
            unit_name: unitDetails.name,
            unit: unitDetails,
            conversion: convDataFromDB.conversion,
            basePrice: convDataFromDB.basePrice || 0,
            sellPrice: convDataFromDB.sellPrice || 0,
            conversion_rate: convDataFromDB.conversion_rate,
          });
        }
      });
    } else {
      // Reset unit conversions for add mode
      packageConversionHook.resetConversions();
      packageConversionHook.setBaseUnit('');
      packageConversionHook.setBasePrice(0);
      packageConversionHook.setSellPrice(0);
      cache.clearCache();
    }
  }, [
    formState,
    packageConversionHook,
    cache,
  ]);

  return {
    resetForm: resetFormWrapper,
  };
};