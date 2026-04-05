/* eslint-disable react-refresh/only-export-components */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import Cropper from 'cropperjs';
import { TbPhotoUp } from 'react-icons/tb';
import { formatItemDisplayName } from '@/lib/item-display';
import { parseDisplayNameToMeasurement } from '@/lib/item-measurement-parser';
import {
  cacheImageBlob,
  getCachedImageBlobUrl,
  preloadImages,
  removeCachedImageBlob,
  removeCachedImageSet,
  releaseCachedImageBlobs,
  setCachedImageSet,
} from '@/utils/imageCache';
import { StorageService } from '@/services/api/storage.service';
import {
  useItemForm,
  useItemModal,
  useItemPrice,
  useItemRealtime,
  useItemUI,
  useItemHistory,
} from '../../shared/contexts/useItemFormContext';
import { useItemPriceCalculations } from '../../application/hooks/utils/useItemPriceCalculator';
import { useConversionLogic } from '../../application/hooks/utils/useConversionLogic';
import { useCustomerLevels } from '../../application/hooks/data';
import { useInlineEditor } from '@/hooks/forms/useInlineEditor';
import { itemDataService } from '../../infrastructure/itemData.service';
import { itemStorageService } from '../../infrastructure/itemStorage.service';
import {
  createInventoryUnitFromDosage,
  getInventoryUnitMetaLabel,
  mergeInventoryUnitsWithDosagePreference,
} from '@/lib/item-units';
import {
  toPricingFields,
  toPricingPatch,
} from '../../shared/utils/pricingFieldAdapter';

// Child components
import { ItemFormHeader } from '../molecules';
import ItemBasicInfoForm from '../organisms/ItemBasicInfoForm';
import ItemAdditionalInfoForm from '../organisms/ItemAdditionalInfoForm';
import ItemSettingsForm from '../organisms/ItemSettingsForm';
import ItemPricingForm from '../organisms/ItemPricingForm';
import ItemPackageConversionManager from '../organisms/ItemPackageConversionForm';
import ImageUploader from '@/components/image-manager';
import Button from '@/components/button';
import ImageExpandPreview from '@/components/shared/image-expand-preview';

interface CollapsibleSectionProps {
  isExpanded: boolean;
  onExpand: () => void;
  stackClassName?: string;
  stackStyle?: React.CSSProperties;
  itemId?: string;
  onRequestNextSection?: () => void;
}

interface PricingSectionProps extends CollapsibleSectionProps {
  onLevelPricingToggle?: (isOpen: boolean) => void;
}

interface OptionalSectionProps extends CollapsibleSectionProps {
  itemId?: string;
}

interface BasicInfoRequiredProps {
  itemId?: string;
}

export const areImageSlotsEqual = (
  left: Array<{ url: string; path: string }>,
  right: Array<{ url: string; path: string }>
) =>
  left.length === right.length &&
  left.every(
    (slot, index) =>
      slot.url === right[index]?.url && slot.path === right[index]?.path
  );

export const updateItemFields = async (
  itemId: string,
  updates: Record<string, unknown>
) => {
  const { error } = await itemDataService.updateItemFields(itemId, updates);
  if (error) throw error;
};

export const appendCacheBust = (url: string, token: string | number) =>
  url.includes('?') ? `${url}&t=${token}` : `${url}?t=${token}`;

const enrichInventoryUnitsWithDosageDetails = <
  T extends {
    code?: string;
    description?: string | null;
    source_dosage_id?: string | null;
    updated_at?: string | null;
  },
>(
  inventoryUnits: T[],
  dosages: Array<{
    id: string;
    code?: string;
    description?: string;
    updated_at?: string | null;
  }>
) =>
  inventoryUnits.map(unit => {
    if (!unit.source_dosage_id) return unit;

    const dosage = dosages.find(item => item.id === unit.source_dosage_id);
    if (!dosage) return unit;

    return {
      ...unit,
      code: dosage.code || unit.code,
      description: dosage.description ?? unit.description ?? null,
      updated_at: dosage.updated_at ?? unit.updated_at ?? null,
    };
  });

// Header Section

const FormHeader: React.FC<{
  onReset?: () => void;
  onClose: () => void;
  itemId?: string;
}> = ({ onReset, onClose, itemId }) => {
  const {
    isEditMode,
    formattedUpdateAt,
    isClosing,
    handleVersionSelect,
    viewingVersionNumber,
  } = useItemUI();
  const historyState = useItemHistory();

  // Get current version number (latest version)
  const currentVersionNumber =
    historyState?.data && historyState.data.length > 0
      ? historyState.data[0].version_number
      : undefined;

  return (
    <ItemFormHeader
      isEditMode={isEditMode}
      formattedUpdateAt={formattedUpdateAt}
      isClosing={isClosing}
      onReset={onReset}
      onClose={onClose}
      history={historyState?.data || null}
      isHistoryLoading={historyState?.isLoading || false}
      selectedVersion={viewingVersionNumber}
      currentVersion={currentVersionNumber}
      onVersionSelect={handleVersionSelect}
      entityId={itemId}
    />
  );
};

// Basic Info (Required) Section

const BasicInfoRequiredSection: React.FC<BasicInfoRequiredProps> = () => {
  const {
    formData,
    categories,
    types,
    packages,
    units,
    dosages,
    manufacturers,
    loading,
    handleChange,
    updateFormData,
  } = useItemForm();

  const { resetKey, isViewingOldVersion, isEditMode } = useItemUI();
  const { packageConversionHook } = useItemPrice();

  const {
    handleAddNewCategory,
    handleAddNewType,
    handleAddNewUnit,
    handleAddNewDosage,
    handleAddNewManufacturer,
    isAddEditModalOpen,
    isAddTypeModalOpen,
    isAddUnitModalOpen,
    isAddDosageModalOpen,
    isAddManufacturerModalOpen,
    persistedDropdownName,
    setPersistedDropdownName,
  } = useItemModal();
  const isAnyChildEntityModalOpen =
    isAddEditModalOpen ||
    isAddTypeModalOpen ||
    isAddUnitModalOpen ||
    isAddDosageModalOpen ||
    isAddManufacturerModalOpen;

  // Transform database types to DropdownOption format
  const transformedCategories = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    code: cat.code,
    description: cat.description,
    updated_at: cat.updated_at,
  }));
  const transformedTypes = types.map(type => ({
    id: type.id,
    name: type.name,
    code: type.code,
    description: type.description,
    updated_at: type.updated_at,
  }));
  const transformedPackages = packages.map(pkg => ({
    id: pkg.id,
    name: pkg.name,
    code: pkg.code,
    description: pkg.description,
    updated_at: pkg.updated_at,
  }));
  const transformedDosages = dosages.map(dosage => ({
    id: dosage.id,
    name: dosage.name,
    code: dosage.code,
    description: dosage.description,
    updated_at: dosage.updated_at,
  }));
  const transformedManufacturers = manufacturers.map(manufacturer => ({
    id: manufacturer.id,
    name: manufacturer.name,
    code: manufacturer.code,
    description: manufacturer.address, // Use address field as description for hover detail
    updated_at: manufacturer.updated_at,
  }));

  const displayName = formatItemDisplayName({
    name: formData.name || '',
    measurement_value: formData.quantity || null,
    measurement_unit: units.find(unit => unit.id === formData.unit_id) || null,
    measurement_denominator_value:
      formData.measurement_denominator_value ?? null,
    measurement_denominator_unit:
      units.find(
        unit => unit.id === formData.measurement_denominator_unit_id
      ) || null,
  });

  const handleFieldChange = (field: string, value: boolean | string) => {
    if (field === 'is_medicine' && value === false) {
      updateFormData({
        is_medicine: value as boolean,
        has_expiry_date: false,
      });
    } else if (field === 'is_medicine') {
      updateFormData({ is_medicine: value as boolean });
    } else if (field === 'code') {
      updateFormData({ code: value as string });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (e.target.name === 'name') {
      const parsed = parseDisplayNameToMeasurement(e.target.value, units);
      updateFormData({
        name: parsed.name,
        quantity: parsed.measurementValue ?? 0,
        unit_id: parsed.measurementUnitId,
        measurement_denominator_value:
          parsed.measurementDenominatorValue ?? null,
        measurement_denominator_unit_id: parsed.measurementDenominatorUnitId,
      });
      return;
    }

    handleChange(e);
  };

  const handleDropdownChange = (field: string, value: string) => {
    if (field === 'category_id') {
      updateFormData({ category_id: value });
    } else if (field === 'type_id') {
      updateFormData({ type_id: value });
    } else if (field === 'package_id') {
      updateFormData({
        package_id: value,
        base_inventory_unit_id: formData.base_inventory_unit_id || value,
      });
      const selectedPackage = packages.find(pkg => pkg.id === value);
      if (selectedPackage) {
        packageConversionHook.setBaseUnit(selectedPackage.name);
        if (!formData.base_inventory_unit_id) {
          packageConversionHook.setBaseInventoryUnitId(selectedPackage.id);
          packageConversionHook.setBaseUnitKind('packaging');
        }
      }
    } else if (field === 'dosage_id') {
      updateFormData({ dosage_id: value });
    } else if (field === 'manufacturer_id') {
      updateFormData({ manufacturer_id: value });
    }
  };

  return (
    <ItemBasicInfoForm
      key={resetKey} // Force re-mount on reset to clear validation
      isEditMode={isEditMode}
      formData={{
        code: formData.code || '',
        display_name: displayName,
        name: formData.name || '',
        manufacturer_id: formData.manufacturer_id || '',
        is_medicine: formData.is_medicine || false,
        category_id: formData.category_id || '',
        type_id: formData.type_id || '',
        package_id: formData.package_id || '',
        dosage_id: formData.dosage_id || '',
      }}
      categories={transformedCategories}
      types={transformedTypes}
      packages={transformedPackages}
      dosages={transformedDosages}
      manufacturers={transformedManufacturers}
      loading={loading}
      disabled={isViewingOldVersion}
      onDisplayNameChange={value => {
        const syntheticEvent = {
          target: { name: 'name', value },
        } as React.ChangeEvent<HTMLInputElement>;
        handleInputChange(syntheticEvent);
      }}
      onFieldChange={handleFieldChange}
      onDropdownChange={handleDropdownChange}
      persistedDropdownName={persistedDropdownName || null}
      freezePersistedDropdown={isAnyChildEntityModalOpen}
      onPersistedDropdownClear={() => setPersistedDropdownName?.(null)}
      onAddNewCategory={searchTerm => {
        setPersistedDropdownName?.('category_id');
        handleAddNewCategory(searchTerm);
      }}
      onAddNewType={searchTerm => {
        setPersistedDropdownName?.('type_id');
        handleAddNewType(searchTerm);
      }}
      onAddNewUnit={searchTerm => {
        setPersistedDropdownName?.('package_id');
        handleAddNewUnit(searchTerm);
      }}
      onAddNewDosage={searchTerm => {
        setPersistedDropdownName?.('dosage_id');
        handleAddNewDosage(searchTerm);
      }}
      onAddNewManufacturer={searchTerm => {
        setPersistedDropdownName?.('manufacturer_id');
        handleAddNewManufacturer(searchTerm);
      }}
    />
  );
};

// Settings Section

const SettingsSection: React.FC<CollapsibleSectionProps> = ({
  isExpanded,
  onExpand,
  stackClassName,
  stackStyle,
  onRequestNextSection,
}) => {
  const { formData, updateFormData } = useItemForm();
  const { isViewingOldVersion } = useItemUI();

  const minStockEditor = useInlineEditor({
    initialValue: (formData.min_stock || 0).toString(),
    onSave: value => {
      const parsedValue = parseInt(value.toString()) || 0;
      updateFormData({ min_stock: parsedValue });
    },
  });

  const handleFieldChange = (field: string, value: boolean | string) => {
    if (field === 'is_medicine' && value === false) {
      updateFormData({
        is_medicine: value as boolean,
        has_expiry_date: false,
      });
    } else if (field === 'is_medicine') {
      updateFormData({ is_medicine: value as boolean });
    } else if (field === 'is_active') {
      updateFormData({ is_active: value as boolean });
    } else if (field === 'has_expiry_date') {
      updateFormData({ has_expiry_date: value as boolean });
    } else if (field === 'min_stock') {
      updateFormData({ min_stock: parseInt(value as string) || 0 });
    }
  };

  return (
    <ItemSettingsForm
      formData={{
        is_active: formData.is_active ?? true,
        is_medicine: formData.is_medicine || false,
        has_expiry_date: formData.has_expiry_date || false,
        min_stock: formData.min_stock || 0,
      }}
      minStockEditing={{
        isEditing: minStockEditor.isEditing,
        value: minStockEditor.value,
      }}
      isExpanded={isExpanded}
      onExpand={onExpand}
      stackClassName={stackClassName}
      stackStyle={stackStyle}
      disabled={isViewingOldVersion}
      onFieldChange={handleFieldChange}
      onStartEditMinStock={minStockEditor.startEditing}
      onStopEditMinStock={minStockEditor.stopEditing}
      onMinStockChange={minStockEditor.handleChange}
      onMinStockKeyDown={minStockEditor.handleKeyDown}
      onRequestNextSection={onRequestNextSection}
    />
  );
};

// Pricing Section

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
    // Extract numeric value from currency format (e.g., "Rp 123" -> "123")
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
      key={resetKey} // Force re-mount on reset to clear validation
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

// Package Conversion Section

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
      key={resetKey} // Force re-mount on reset to clear validation and input states
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

const BasicInfoOptionalSection: React.FC<OptionalSectionProps> = ({
  isExpanded,
  onExpand,
  itemId,
  stackClassName,
  stackStyle,
}) => {
  const { formData, loading, handleChange, updateFormData } = useItemForm();
  const { resetKey, isViewingOldVersion, isEditMode } = useItemUI();
  const cacheKey = itemId ? `item-images:${itemId}` : null;
  const isDraftMode = !itemId && !isEditMode;
  const bucketName = 'item_images';
  const resolveSlotPath = useCallback(
    (url: string, slotIndex: number) => {
      if (!url || !itemId) return '';
      const cleanUrl = url.split('?')[0];
      const extracted = StorageService.extractPathFromUrl(cleanUrl, bucketName);
      return extracted || `items/${itemId}/slot-${slotIndex}`;
    },
    [bucketName, itemId]
  );
  const buildSlotsFromUrlsWithItem = useCallback(
    (urls: string[]) =>
      Array.from({ length: 4 }, (_, index) => {
        const url = urls[index] || '';
        return {
          url,
          path: url ? resolveSlotPath(url, index) : '',
        };
      }),
    [resolveSlotPath]
  );
  const [imageSlots, setImageSlots] = useState(
    Array.from({ length: 4 }, () => ({ url: '', path: '' }))
  );
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [previewSlotIndex, setPreviewSlotIndex] = useState<number | null>(null);
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const [displayUrls, setDisplayUrls] = useState<
    Array<{ source: string; display: string }>
  >([]);
  const [cropState, setCropState] = useState<{
    slotIndex: number;
    file: File;
    previewUrl: string;
  } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const cropperRef = useRef<Cropper | null>(null);
  const cropperImageRef = useRef<HTMLImageElement | null>(null);
  const previewCloseTimerRef = useRef<number | null>(null);
  const localPreviewUrlsRef = useRef<Record<number, string>>({});
  const retainedDisplaySourcesRef = useRef<string[]>([]);
  const imageTabIndexMap = useMemo(() => {
    const slots = [0, 1, 2, 3];
    const firstEmptyIndex = imageSlots.findIndex(slot => !slot.url);
    const startIndex = firstEmptyIndex === -1 ? 0 : firstEmptyIndex;
    const ordered = slots.slice(startIndex);
    const map = ordered.reduce<Record<number, number>>((acc, index, order) => {
      acc[index] = 8 + order;
      return acc;
    }, {});
    if (startIndex > 0) {
      for (let index = 0; index < startIndex; index += 1) {
        map[index] = -1;
      }
    }
    return map;
  }, [imageSlots]);

  const previewExitDurationMs = 150;
  const formImageUrls = useMemo(
    () => (Array.isArray(formData.image_urls) ? formData.image_urls : []),
    [formData.image_urls]
  );
  const areImageUrlsEqual = useCallback(
    (left: string[], right: string[]) =>
      left.length === right.length &&
      left.every((value, index) => value === right[index]),
    []
  );

  const openCropper = useCallback((slotIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropState({ slotIndex, file, previewUrl: reader.result });
      } else {
        toast.error('Gagal memuat gambar untuk crop.');
      }
    };
    reader.onerror = () => {
      toast.error('Gagal memuat gambar untuk crop.');
    };
    reader.readAsDataURL(file);
  }, []);

  const closeCropper = useCallback(() => {
    setCropState(null);
  }, []);

  useEffect(() => {
    if (!cropState || !cropperImageRef.current) return;

    let isCancelled = false;

    const imageElement = cropperImageRef.current;

    const initCropper = () => {
      if (isCancelled || !imageElement) return;
      const cropperInstance = new Cropper(imageElement);
      const selection = cropperInstance.getCropperSelection();
      if (selection) {
        selection.initialAspectRatio = 1;
        selection.aspectRatio = 1;
      }

      cropperRef.current = cropperInstance;
    };

    if (imageElement.complete) {
      initCropper();
    } else {
      imageElement.onload = () => {
        initCropper();
      };
    }

    return () => {
      isCancelled = true;
      if (imageElement) {
        imageElement.onload = null;
      }
      if (cropperRef.current) {
        cropperRef.current.destroy();
        cropperRef.current = null;
      }
    };
  }, [cropState]);

  const buildSlotsFromUrls = buildSlotsFromUrlsWithItem;

  const updateImageCache = useCallback(
    (slots: Array<{ url: string }>) => {
      if (!cacheKey) return;
      const urls = slots.map(slot => slot.url);
      const hasImage = urls.some(Boolean);
      if (hasImage) {
        setCachedImageSet(cacheKey, urls);
      } else {
        removeCachedImageSet(cacheKey);
      }
      preloadImages(urls.filter(Boolean));
    },
    [cacheKey]
  );

  const revokeLocalPreview = useCallback((slotIndex: number) => {
    const existing = localPreviewUrlsRef.current[slotIndex];
    if (!existing) return;
    URL.revokeObjectURL(existing);
    delete localPreviewUrlsRef.current[slotIndex];
  }, []);

  const setLocalPreviewForSlot = useCallback(
    (slotIndex: number, file: File) => {
      const objectUrl = URL.createObjectURL(file);
      const existing = localPreviewUrlsRef.current[slotIndex];
      if (existing) {
        URL.revokeObjectURL(existing);
      }
      localPreviewUrlsRef.current[slotIndex] = objectUrl;
      return objectUrl;
    },
    []
  );

  useEffect(() => {
    let isActive = true;
    let didCommit = false;
    const previousSources = retainedDisplaySourcesRef.current;
    const nextSources = imageSlots
      .map(slot => slot.url)
      .filter(source => source && source.startsWith('http'));
    const nextSourceSet = new Set(nextSources);
    const releaseSources = previousSources.filter(
      source => !nextSourceSet.has(source)
    );

    const resolveDisplayUrls = async () => {
      const results = await Promise.all(
        imageSlots.map(async slot => {
          const source = slot.url || '';
          if (!source) return { source: '', display: '' };
          if (!source.startsWith('http')) return { source, display: source };
          const cachedBlobUrl = await getCachedImageBlobUrl(source);
          if (cachedBlobUrl) return { source, display: cachedBlobUrl };
          const blobUrl = await cacheImageBlob(source);
          return { source, display: blobUrl || source };
        })
      );

      if (!isActive) {
        releaseCachedImageBlobs(nextSources);
        return;
      }

      releaseCachedImageBlobs(releaseSources);
      retainedDisplaySourcesRef.current = nextSources;
      setDisplayUrls(results);
      didCommit = true;
    };

    void resolveDisplayUrls();

    return () => {
      if (!didCommit) {
        releaseCachedImageBlobs(nextSources);
      }
      isActive = false;
    };
  }, [imageSlots]);

  useEffect(() => {
    return () => {
      releaseCachedImageBlobs(retainedDisplaySourcesRef.current);
      retainedDisplaySourcesRef.current = [];
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(localPreviewUrlsRef.current).forEach(url => {
        URL.revokeObjectURL(url);
      });
      localPreviewUrlsRef.current = {};
    };
  }, []);

  const buildImageUrlsPayload = useCallback((slots: Array<{ url: string }>) => {
    const urls = slots.map(slot => slot.url || '');
    return urls.some(Boolean) ? urls : [];
  }, []);

  const syncPendingImageUrls = useCallback(
    (slots: Array<{ url: string }>) => {
      const nextImageUrls = buildImageUrlsPayload(slots);
      if (areImageUrlsEqual(formImageUrls, nextImageUrls)) return;
      updateFormData({ image_urls: nextImageUrls });
    },
    [areImageUrlsEqual, buildImageUrlsPayload, formImageUrls, updateFormData]
  );

  useEffect(() => {
    if (!isDraftMode) return;
    const nextImageUrls = buildImageUrlsPayload(imageSlots);
    if (areImageUrlsEqual(formImageUrls, nextImageUrls)) return;
    updateFormData({ image_urls: nextImageUrls });
  }, [
    areImageUrlsEqual,
    buildImageUrlsPayload,
    formImageUrls,
    imageSlots,
    isDraftMode,
    updateFormData,
  ]);

  const handleBrokenImage = useCallback(
    (slotIndex: number) => {
      setImageSlots(prevSlots => {
        const nextSlots = prevSlots.map((slot, index) =>
          index === slotIndex ? { path: '', url: '' } : slot
        );
        updateImageCache(nextSlots);
        syncPendingImageUrls(nextSlots);
        return nextSlots;
      });
    },
    [syncPendingImageUrls, updateImageCache]
  );

  useEffect(() => {
    if (!itemId) return;

    if (formImageUrls.length > 0) {
      const nextSlots = buildSlotsFromUrls(formImageUrls);
      setImageSlots(nextSlots);
      updateImageCache(nextSlots);
      setIsLoadingImages(false);
      return;
    }

    if (loading) {
      return;
    }

    let isMounted = true;

    const loadItemImages = async () => {
      setIsLoadingImages(true);
      const { data, error } = await itemStorageService.listItemImages(
        bucketName,
        itemId
      );

      if (!isMounted) return;

      if (error) {
        toast.error('Gagal memuat gambar item.');
        setImageSlots(Array.from({ length: 4 }, () => ({ url: '', path: '' })));
        setIsLoadingImages(false);
        return;
      }

      const nextSlots = Array.from({ length: 4 }, () => ({
        url: '',
        path: '',
      }));

      data?.forEach(file => {
        const match = file.name.match(/^slot-(\d)$/);
        if (!match) return;
        const slotIndex = Number(match[1]);
        if (Number.isNaN(slotIndex) || slotIndex < 0 || slotIndex > 3) return;
        const path = `items/${itemId}/${file.name}`;
        const versionToken = file.updated_at
          ? new Date(file.updated_at).getTime()
          : Date.now();
        nextSlots[slotIndex] = {
          path,
          url: appendCacheBust(
            StorageService.getPublicUrl(bucketName, path),
            versionToken
          ),
        };
      });

      setImageSlots(nextSlots);
      updateImageCache(nextSlots);
      setIsLoadingImages(false);
    };

    void loadItemImages();

    return () => {
      isMounted = false;
    };
  }, [
    bucketName,
    buildSlotsFromUrls,
    cacheKey,
    formImageUrls,
    itemId,
    loading,
    updateImageCache,
  ]);

  useEffect(() => {
    if (!itemId) return;

    const nextSlots = buildSlotsFromUrls(formImageUrls);
    setImageSlots(prevSlots =>
      areImageSlotsEqual(prevSlots, nextSlots) ? prevSlots : nextSlots
    );
    updateImageCache(nextSlots);
    setIsLoadingImages(false);
  }, [buildSlotsFromUrls, formImageUrls, itemId, updateImageCache]);

  const handleOptionalChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    handleChange(e);
  };

  const getImageDimensions = useCallback((file: File) => {
    return new Promise<{ width: number; height: number }>((resolve, reject) => {
      const fallbackToImage = () => {
        const reader = new FileReader();
        reader.onload = () => {
          const image = new Image();
          image.onload = () => {
            resolve({ width: image.width, height: image.height });
          };
          image.onerror = () => {
            reject(new Error('Gagal memuat gambar.'));
          };
          if (typeof reader.result === 'string') {
            image.src = reader.result;
          } else {
            reject(new Error('Gagal memuat gambar.'));
          }
        };
        reader.onerror = () => {
          reject(new Error('Gagal memuat gambar.'));
        };
        reader.readAsDataURL(file);
      };

      if (typeof createImageBitmap === 'function') {
        createImageBitmap(file)
          .then(bitmap => {
            resolve({ width: bitmap.width, height: bitmap.height });
            if (typeof bitmap.close === 'function') {
              bitmap.close();
            }
          })
          .catch(fallbackToImage);
        return;
      }

      fallbackToImage();
    });
  }, []);

  const handleImageUpload = useCallback(
    async (slotIndex: number, file: File) => {
      try {
        const { width, height } = await getImageDimensions(file);
        if (width !== height) {
          openCropper(slotIndex, file);
          return;
        }
      } catch {
        toast.error('Gagal membaca ukuran gambar.');
        return;
      }

      const previewUrl = setLocalPreviewForSlot(slotIndex, file);
      setImageSlots(prevSlots => {
        const nextSlots = prevSlots.map((slot, index) =>
          index === slotIndex ? { path: '', url: previewUrl } : slot
        );
        updateImageCache(nextSlots);
        syncPendingImageUrls(nextSlots);
        return nextSlots;
      });
    },
    [
      getImageDimensions,
      openCropper,
      setLocalPreviewForSlot,
      syncPendingImageUrls,
      updateImageCache,
    ]
  );

  const handleCropConfirm = useCallback(async () => {
    if (!cropState || !cropperRef.current) return;
    setIsCropping(true);

    try {
      const selection = cropperRef.current.getCropperSelection();
      if (!selection) {
        throw new Error('Gagal memproses gambar.');
      }
      const canvas = await selection.$toCanvas({
        width: 1024,
        height: 1024,
      });

      const mimeType = cropState.file.type || 'image/jpeg';
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result: Blob | null) => {
            if (result) resolve(result);
            else reject(new Error('Gagal memproses gambar.'));
          },
          mimeType,
          0.9
        );
      });

      const croppedFile = new File([blob], cropState.file.name, {
        type: blob.type,
        lastModified: Date.now(),
      });

      const targetSlot = cropState.slotIndex;
      closeCropper();
      const previewUrl = setLocalPreviewForSlot(targetSlot, croppedFile);
      setImageSlots(prevSlots => {
        const nextSlots = prevSlots.map((slot, index) =>
          index === targetSlot ? { path: '', url: previewUrl } : slot
        );
        updateImageCache(nextSlots);
        syncPendingImageUrls(nextSlots);
        return nextSlots;
      });
    } catch {
      toast.error('Gagal memproses gambar.');
    } finally {
      setIsCropping(false);
    }
  }, [
    closeCropper,
    cropState,
    setLocalPreviewForSlot,
    syncPendingImageUrls,
    updateImageCache,
  ]);

  const handleImageDelete = useCallback(
    async (slotIndex: number) => {
      const targetSlot = imageSlots[slotIndex];
      try {
        revokeLocalPreview(slotIndex);
        if (targetSlot.url) {
          await removeCachedImageBlob(targetSlot.url);
        }
        setImageSlots(prevSlots => {
          const nextSlots = prevSlots.map((slot, index) =>
            index === slotIndex ? { path: '', url: '' } : slot
          );
          updateImageCache(nextSlots);
          syncPendingImageUrls(nextSlots);
          return nextSlots;
        });
      } catch (deleteError) {
        console.error(deleteError);
        toast.error('Gagal menghapus gambar.');
      }
    },
    [imageSlots, revokeLocalPreview, syncPendingImageUrls, updateImageCache]
  );

  const getDisplayUrlForSlot = useCallback(
    (slot: { url: string }, index: number) =>
      displayUrls[index]?.source === slot.url
        ? displayUrls[index]?.display || slot.url
        : slot.url,
    [displayUrls]
  );

  const previewImageUrl =
    previewSlotIndex !== null
      ? getDisplayUrlForSlot(imageSlots[previewSlotIndex], previewSlotIndex)
      : null;

  const closePreview = useCallback(() => {
    setIsPreviewVisible(false);
    if (previewCloseTimerRef.current) {
      window.clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
    previewCloseTimerRef.current = window.setTimeout(() => {
      setPreviewSlotIndex(null);
      previewCloseTimerRef.current = null;
    }, previewExitDurationMs);
  }, [previewExitDurationMs]);

  const openPreview = useCallback((slotIndex: number) => {
    if (previewCloseTimerRef.current) {
      window.clearTimeout(previewCloseTimerRef.current);
      previewCloseTimerRef.current = null;
    }
    setPreviewSlotIndex(slotIndex);
    window.requestAnimationFrame(() => {
      setIsPreviewVisible(true);
    });
  }, []);

  useEffect(() => {
    if (previewSlotIndex === null) return;
    if (!imageSlots[previewSlotIndex]?.url) {
      closePreview();
    }
  }, [closePreview, imageSlots, previewSlotIndex]);

  useEffect(
    () => () => {
      if (previewCloseTimerRef.current) {
        window.clearTimeout(previewCloseTimerRef.current);
      }
    },
    []
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3" data-stack-ignore="true">
        {imageSlots.map((slot, index) => (
          <ImageUploader
            key={`item-image-${index}`}
            id={`item-image-${index}`}
            shape="rounded"
            hasImage={Boolean(slot.url)}
            disabled={
              isViewingOldVersion || (isLoadingImages && Boolean(slot.url))
            }
            interaction="direct"
            isPopupSuppressed={Boolean(previewSlotIndex !== null || cropState)}
            onImageUpload={file => handleImageUpload(index, file)}
            onImageDelete={() => handleImageDelete(index)}
            className="w-full"
            validTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
            loadingIcon={null}
            tabIndex={imageTabIndexMap[index]}
          >
            {slot.url ? (
              <img
                src={getDisplayUrlForSlot(slot, index)}
                alt={`Item ${index + 1}`}
                className="aspect-square w-full rounded-xl border border-slate-200 object-cover cursor-zoom-in transition duration-200 group-hover:brightness-95 group-focus-visible:brightness-95"
                onError={() => handleBrokenImage(index)}
                onClick={event => {
                  event.stopPropagation();
                  openPreview(index);
                }}
              />
            ) : (
              <div className="aspect-square w-full rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 transition duration-200 group-hover:bg-slate-100 group-focus-visible:bg-slate-100">
                <TbPhotoUp className="h-6 w-6" />
                <span className="sr-only">Unggah gambar</span>
              </div>
            )}
          </ImageUploader>
        ))}
      </div>
      {previewSlotIndex !== null && previewImageUrl ? (
        <ImageExpandPreview
          isOpen={true}
          isVisible={isPreviewVisible}
          onClose={closePreview}
          backdropClassName="z-[70] px-4 py-6"
          contentClassName="max-h-[92vh] max-w-[92vw] p-0"
          backdropRole="button"
          backdropTabIndex={0}
          backdropAriaLabel="Tutup preview gambar"
        >
          <ImageUploader
            key={`preview-${previewSlotIndex}`}
            id={`item-image-preview-${previewSlotIndex}`}
            shape="rounded"
            hasImage={true}
            onPopupClose={closePreview}
            className="max-h-[92vh] max-w-[92vw]"
            popupTrigger="click"
            onImageUpload={async file => {
              const slotIndex = previewSlotIndex;
              closePreview();
              await handleImageUpload(slotIndex, file);
            }}
            onImageDelete={async () => {
              const slotIndex = previewSlotIndex;
              closePreview();
              await handleImageDelete(slotIndex);
            }}
            validTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
          >
            <img
              src={previewImageUrl}
              alt="Preview"
              className="max-h-[92vh] max-w-[92vw] rounded-xl object-contain shadow-xl"
            />
          </ImageUploader>
        </ImageExpandPreview>
      ) : null}
      {cropState &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="w-[90vw] max-w-[560px] rounded-2xl bg-white p-5 shadow-xl">
              <div className="text-base font-semibold text-slate-800 mb-3">
                Crop gambar (1:1)
              </div>
              <div className="w-full h-[320px] bg-slate-50 rounded-xl overflow-hidden">
                <img
                  ref={cropperImageRef}
                  src={cropState.previewUrl}
                  alt="Crop"
                  className="max-h-[320px] w-full object-contain"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="text"
                  size="sm"
                  onClick={closeCropper}
                  disabled={isCropping}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCropConfirm}
                  isLoading={isCropping}
                >
                  Simpan
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
      <ItemAdditionalInfoForm
        key={resetKey} // Force re-mount on reset to clear validation
        formData={{
          barcode: formData.barcode || '',
          description: formData.description || '',
        }}
        isExpanded={isExpanded}
        onExpand={onExpand}
        stackClassName={stackClassName}
        stackStyle={stackStyle}
        disabled={isViewingOldVersion}
        onChange={handleOptionalChange}
      />
    </div>
  );
};

// Compound component export
export const ItemFormSections = {
  Header: FormHeader,
  BasicInfoRequired: BasicInfoRequiredSection,
  BasicInfoOptional: BasicInfoOptionalSection,
  Settings: SettingsSection,
  Pricing: PricingSection,
  PackageConversion: PackageConversionSection,
};
