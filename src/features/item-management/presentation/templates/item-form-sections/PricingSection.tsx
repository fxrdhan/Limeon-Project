import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useInlineEditor } from '@/hooks/forms/useInlineEditor';
import {
  createInventoryUnitFromDosage,
  getInventoryUnitMetaLabel,
  mergeInventoryUnitsWithDosagePreference,
} from '@/lib/item-units';
import { useCustomerLevels } from '../../../application/hooks/data/useCustomerLevels';
import { useItemPriceCalculations } from '../../../application/hooks/utils/useItemPriceCalculator';
import { itemDataService } from '../../../infrastructure/itemData.service';
import {
  useItemForm,
  useItemPrice,
  useItemUI,
} from '../../../shared/contexts/useItemFormContext';
import {
  toPricingFields,
  toPricingPatch,
} from '../../../shared/utils/pricingFieldAdapter';
import ItemPricingForm from '../../organisms/ItemPricingForm';
import { enrichInventoryUnitsWithDosageDetails } from './inventoryUnitSectionUtils';
import type { PricingSectionProps } from './types';

const PricingSection: React.FC<PricingSectionProps> = ({
  isExpanded,
  onExpand,
  stackClassName,
  stackStyle,
  onLevelPricingToggle,
}) => {
  const { formData, updateFormData, handleChange, dosages, packages } =
    useItemForm();
  const { packageConversionHook, displayBasePrice, displaySellPrice } =
    useItemPrice();

  const {
    levels,
    isLoading: isCustomerLevelsLoading,
    createLevel,
    updateLevels,
    deleteLevel,
  } = useCustomerLevels();
  const [showLevelPricing, setShowLevelPricing] = useState(false);

  const { resetKey, isViewingOldVersion } = useItemUI();

  useEffect(() => {
    onLevelPricingToggle?.(showLevelPricing);
  }, [onLevelPricingToggle, showLevelPricing]);

  const handlePricingExpand = useCallback(() => {
    if (showLevelPricing && isExpanded) {
      setShowLevelPricing(false);
    }
    onExpand();
  }, [isExpanded, onExpand, showLevelPricing]);

  const pricingFields = useMemo(
    () =>
      toPricingFields({
        base_price: formData.base_price,
        sell_price: formData.sell_price,
        is_level_pricing_active: formData.is_level_pricing_active,
      }),
    [formData.base_price, formData.sell_price, formData.is_level_pricing_active]
  );

  const selectedDosage = useMemo(
    () =>
      formData.dosage_id
        ? dosages.find(dosage => dosage.id === formData.dosage_id) || null
        : null,
    [dosages, formData.dosage_id]
  );

  const dosageBackedUnit = useMemo(
    () => createInventoryUnitFromDosage(selectedDosage),
    [selectedDosage]
  );

  useEffect(() => {
    if (!selectedDosage?.id || !selectedDosage.name) return;
    if (
      packageConversionHook.availableUnits.some(
        unit => unit.source_dosage_id === selectedDosage.id
      )
    ) {
      return;
    }

    let cancelled = false;

    void itemDataService
      .ensureInventoryUnitFromDosage(selectedDosage.id, selectedDosage.name)
      .then(result => {
        if (cancelled || !result.data) return;
        void packageConversionHook.refreshAvailableUnits();
      });

    return () => {
      cancelled = true;
    };
  }, [
    packageConversionHook,
    packageConversionHook.availableUnits,
    selectedDosage,
  ]);

  const baseUnitOptions = useMemo(() => {
    const mergedUnits = enrichInventoryUnitsWithDosageDetails(
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

    const options = mergedUnits.map(unit => ({
      id: unit.id,
      name: unit.name,
      code: unit.code,
      description: unit.description ?? undefined,
      updated_at: unit.updated_at,
      metaLabel: getInventoryUnitMetaLabel(unit),
    }));

    return options.sort((left, right) => left.name.localeCompare(right.name));
  }, [
    dosageBackedUnit,
    dosages,
    packageConversionHook.availableUnits,
    packages,
  ]);

  const { calculateProfitPercentage: calcMargin } = useItemPriceCalculations({
    basePrice: pricingFields.basePrice,
    sellPrice: pricingFields.sellPrice,
  });

  const marginEditor = useInlineEditor({
    initialValue: (calcMargin || 0).toString(),
    onSave: value => {
      const basePrice = pricingFields.basePrice;
      const marginPercentage = parseFloat(value.toString()) || 0;
      const newSellPrice = basePrice + (basePrice * marginPercentage) / 100;
      updateFormData(toPricingPatch({ sellPrice: newSellPrice }));
    },
  });

  const handleSellPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanValue = e.target.value
      .replace(/^Rp\s*/, '')
      .replace(/[^0-9]/g, '');
    const value = parseFloat(cleanValue) || 0;
    updateFormData(toPricingPatch({ sellPrice: value }));
    marginEditor.setValue((calcMargin || 0).toString());
  };

  const handleBasePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
  };

  const customerLevelDiscounts = useMemo(
    () =>
      Array.isArray(formData.customer_level_discounts)
        ? formData.customer_level_discounts
        : [],
    [formData.customer_level_discounts]
  );

  const discountByLevel = useMemo(() => {
    const mapped: Record<string, number> = {};
    customerLevelDiscounts.forEach(discount => {
      if (!discount.customer_level_id) return;
      mapped[discount.customer_level_id] =
        Number(discount.discount_percentage) || 0;
    });
    return mapped;
  }, [customerLevelDiscounts]);

  const handleDiscountChange = useCallback(
    (levelId: string, value: string) => {
      const trimmedValue = value.trim();
      const parsedValue = trimmedValue
        ? Number(trimmedValue.replace(',', '.'))
        : 0;
      const normalizedValue = Number.isNaN(parsedValue)
        ? 0
        : Math.min(Math.max(parsedValue, 0), 100);

      const nextDiscounts = customerLevelDiscounts.filter(
        discount => discount.customer_level_id !== levelId
      );

      if (trimmedValue !== '') {
        nextDiscounts.push({
          customer_level_id: levelId,
          discount_percentage: normalizedValue,
        });
      }

      updateFormData({ customer_level_discounts: nextDiscounts });
    },
    [customerLevelDiscounts, updateFormData]
  );

  return (
    <ItemPricingForm
      key={resetKey}
      formData={{
        base_price: pricingFields.basePrice,
        sell_price: pricingFields.sellPrice,
        is_level_pricing_active: pricingFields.isLevelPricingActive,
      }}
      displayBasePrice={displayBasePrice}
      displaySellPrice={displaySellPrice}
      baseUnitId={formData.base_inventory_unit_id || ''}
      baseUnit={packageConversionHook.baseUnit}
      baseUnitOptions={baseUnitOptions}
      marginEditing={{
        isEditing: marginEditor.isEditing,
        percentage: marginEditor.value,
      }}
      calculatedMargin={calcMargin || 0}
      showLevelPricing={showLevelPricing}
      onShowLevelPricing={() => setShowLevelPricing(true)}
      onHideLevelPricing={() => setShowLevelPricing(false)}
      levelPricing={
        showLevelPricing
          ? {
              levels,
              isLoading: isCustomerLevelsLoading,
              discountByLevel,
              onDiscountChange: handleDiscountChange,
              onCreateLevel: createLevel.mutateAsync,
              isCreating: createLevel.isPending,
              onUpdateLevels: updateLevels.mutateAsync,
              isUpdating: updateLevels.isPending,
              onDeleteLevel: deleteLevel.mutateAsync,
              isDeleting: deleteLevel.isPending,
            }
          : undefined
      }
      isExpanded={isExpanded}
      onExpand={handlePricingExpand}
      stackClassName={stackClassName}
      stackStyle={stackStyle}
      disabled={isViewingOldVersion}
      onBaseUnitChange={value => {
        const selectedUnit = mergeInventoryUnitsWithDosagePreference(
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
        ).find(unit => unit.id === value);
        if (!selectedUnit) return;

        updateFormData({ base_inventory_unit_id: value });
        packageConversionHook.setBaseInventoryUnitId(value);
        packageConversionHook.setBaseUnit(selectedUnit.name);
        packageConversionHook.setBaseUnitKind(selectedUnit.kind);
      }}
      onBasePriceChange={handleBasePriceChange}
      onSellPriceChange={handleSellPriceChange}
      onMarginChange={marginEditor.setValue}
      onStartEditMargin={marginEditor.startEditing}
      onStopEditMargin={marginEditor.stopEditing}
      onMarginInputChange={marginEditor.handleChange}
      onMarginKeyDown={marginEditor.handleKeyDown}
      isLevelPricingActive={pricingFields.isLevelPricingActive}
      onLevelPricingActiveChange={active => {
        updateFormData(toPricingPatch({ isLevelPricingActive: active }));
      }}
    />
  );
};

export default PricingSection;
