import { useCallback } from 'react';
import type { ItemFormData, PackageConversion } from '../../../shared/types';
import type { ItemInventoryUnit } from '@/types/database';

interface UseItemFormResetProps {
  formState: {
    resetForm: () => void;
    isEditMode: boolean;
    initialFormData: ItemFormData | null;
    initialPackageConversions: PackageConversion[] | null;
    units: ItemInventoryUnit[];
  };
  packageConversionHook: {
    resetConversions: () => void;
    setBaseUnit: (unit: string) => void;
    setBaseInventoryUnitId: (unitId: string) => void;
    setBaseUnitKind: (kind: 'packaging' | 'retail_unit' | 'custom') => void;
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
      const baseUnit =
        formState.units.find(
          u => u.id === formState.initialFormData!.base_inventory_unit_id
        ) || null;
      const baseUnitName = baseUnit?.name || '';
      packageConversionHook.setBaseUnit(baseUnitName);
      packageConversionHook.setBaseInventoryUnitId(
        formState.initialFormData.base_inventory_unit_id || ''
      );
      packageConversionHook.setBaseUnitKind(baseUnit?.kind || 'packaging');
      packageConversionHook.setBasePrice(
        formState.initialFormData.base_price || 0
      );
      packageConversionHook.setSellPrice(
        formState.initialFormData.sell_price || 0
      );
      packageConversionHook.skipNextRecalculation();

      formState.initialPackageConversions.forEach(convDataFromDB => {
        if (typeof convDataFromDB.conversion_rate === 'number') {
          packageConversionHook.addPackageConversion({
            id: convDataFromDB.id || `temp-${Date.now()}-${Math.random()}`,
            inventory_unit_id:
              convDataFromDB.inventory_unit_id || convDataFromDB.to_unit_id,
            to_unit_id: convDataFromDB.to_unit_id,
            unit_name: convDataFromDB.unit_name,
            unit: convDataFromDB.unit,
            parent_inventory_unit_id:
              convDataFromDB.parent_inventory_unit_id || null,
            contains_quantity:
              convDataFromDB.contains_quantity ||
              convDataFromDB.conversion_rate,
            factor_to_base:
              convDataFromDB.factor_to_base || convDataFromDB.conversion_rate,
            conversion_rate: convDataFromDB.conversion_rate,
            base_price_override: convDataFromDB.base_price_override,
            sell_price_override: convDataFromDB.sell_price_override,
            base_price: convDataFromDB.base_price || 0,
            sell_price: convDataFromDB.sell_price || 0,
          });
        }
      });
    } else {
      // Reset unit conversions for add mode
      packageConversionHook.resetConversions();
      packageConversionHook.setBaseUnit('');
      packageConversionHook.setBaseInventoryUnitId('');
      packageConversionHook.setBaseUnitKind('packaging');
      packageConversionHook.setBasePrice(0);
      packageConversionHook.setSellPrice(0);
      cache.clearCache();
    }
  }, [formState, packageConversionHook, cache]);

  return {
    resetForm: resetFormWrapper,
  };
};
