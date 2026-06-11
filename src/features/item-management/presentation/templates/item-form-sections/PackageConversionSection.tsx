import React, { useCallback, useMemo } from 'react';
import {
  createInventoryUnitFromDosage,
  mergeInventoryUnitsWithDosagePreference,
} from '@/lib/item-units';
import { useConversionLogic } from '../../../application/hooks/utils/useConversionLogic';
import {
  useItemForm,
  useItemPrice,
  useItemRealtime,
  useItemUI,
} from '../../../shared/contexts/useItemFormContext';
import ItemPackageConversionManager from '../../organisms/ItemPackageConversionForm';
import { enrichInventoryUnitsWithDosageDetails } from './inventoryUnitSectionUtils';
import type { CollapsibleSectionProps } from './types';

const PackageConversionSection: React.FC<CollapsibleSectionProps> = ({
  isExpanded,
  onExpand,
  stackClassName,
  stackStyle,
}) => {
  const { formData, dosages, packages } = useItemForm();
  const { packageConversionHook } = useItemPrice();
  const { resetKey, isViewingOldVersion } = useItemUI();
  const realtime = useItemRealtime();
  const smartFormSync = realtime?.smartFormSync;
  const selectedDosage = formData.dosage_id
    ? dosages.find(dosage => dosage.id === formData.dosage_id) || null
    : null;
  const dosageBackedUnit = createInventoryUnitFromDosage(selectedDosage);
  const availableInventoryUnits = useMemo(() => {
    return enrichInventoryUnitsWithDosageDetails(
      mergeInventoryUnitsWithDosagePreference(
        [
          ...packageConversionHook.availableUnits,
          ...packages
            .filter(
              pkg =>
                !packageConversionHook.availableUnits.some(
                  unit => unit.id === pkg.id
                )
            )
            .map(pkg => ({
              id: pkg.id,
              name: pkg.name,
              code: pkg.code,
              description: pkg.description ?? null,
              kind: 'packaging' as const,
              source_package_id: pkg.id,
            })),
        ],
        dosageBackedUnit
      ),
      dosages
    );
  }, [
    dosageBackedUnit,
    dosages,
    packageConversionHook.availableUnits,
    packages,
  ]);

  const packageConversionLogic = useConversionLogic({
    conversions: packageConversionHook.conversions,
    availableUnits: availableInventoryUnits,
    formData: packageConversionHook.packageConversionFormData,
    addPackageConversion: packageConversionHook.addPackageConversion,
    setFormData: packageConversionHook.setPackageConversionFormData,
    baseUnit: packageConversionHook.baseUnit,
    baseInventoryUnitId: packageConversionHook.baseInventoryUnitId,
  });

  const handleAddConversion = () => {
    const result = packageConversionLogic.validateAndAddConversion();
    if (!result.success && result.error) {
      return;
    }
  };

  const handleConversionInteractionStart = useCallback(() => {
    smartFormSync?.registerActiveField('package_conversions');
  }, [smartFormSync]);

  const handleConversionInteractionEnd = useCallback(() => {
    smartFormSync?.unregisterActiveField('package_conversions');
  }, [smartFormSync]);

  const { removePackageConversion, setConversions } = packageConversionHook;

  const handleRemoveConversion = useCallback(
    (id: string) => {
      removePackageConversion(id);
    },
    [removePackageConversion]
  );

  const handleUpdateSellPrice = useCallback(
    (id: string, sellPrice: number) => {
      setConversions(prevConversions => {
        return prevConversions.map(conversion =>
          conversion.id === id
            ? { ...conversion, sell_price: sellPrice }
            : conversion
        );
      });
    },
    [setConversions]
  );

  return (
    <ItemPackageConversionManager
      key={resetKey}
      baseUnit={packageConversionHook.baseUnit}
      baseUnitId={packageConversionHook.baseInventoryUnitId}
      availableUnits={availableInventoryUnits}
      conversions={packageConversionHook.conversions}
      formData={packageConversionHook.packageConversionFormData}
      isExpanded={isExpanded}
      onExpand={onExpand}
      stackClassName={stackClassName}
      stackStyle={stackStyle}
      disabled={isViewingOldVersion}
      onFormDataChange={packageConversionHook.setPackageConversionFormData}
      onAddConversion={handleAddConversion}
      onRemoveConversion={handleRemoveConversion}
      onInteractionStart={handleConversionInteractionStart}
      onInteractionEnd={handleConversionInteractionEnd}
      onUpdateSellPrice={handleUpdateSellPrice}
    />
  );
};

export default PackageConversionSection;
