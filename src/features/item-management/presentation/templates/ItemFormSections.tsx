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
import 'cropperjs/dist/cropper.css';
import { supabase } from '@/lib/supabase';
import { compressImageIfNeeded } from '@/utils/image';
import { extractNumericValue } from '@/lib/formatters';
import { QueryKeys } from '@/constants/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import {
  cacheImageBlob,
  getCachedImageBlobUrl,
  preloadImages,
  removeCachedImageBlob,
  removeCachedImageSet,
  setCachedImageSet,
} from '@/utils/imageCache';
import { StorageService } from '@/utils/storage';
import {
  useItemForm,
  useItemModal,
  useItemPrice,
  useItemRealtime,
  useItemUI,
  useItemHistory,
} from '../../shared/contexts/useItemFormContext';
import { useItemPriceCalculations } from '../../application/hooks/utils/useItemPriceCalculator';
import { usePackageConversionLogic } from '../../application/hooks/utils/useConversionLogic';
import { useCustomerLevels } from '../../application/hooks/data';
import { useInlineEditor } from '@/hooks/forms/useInlineEditor';

// Child components
import { ItemFormHeader } from '../molecules';
import ItemBasicInfoForm from '../organisms/ItemBasicInfoForm';
import ItemAdditionalInfoForm from '../organisms/ItemAdditionalInfoForm';
import ItemSettingsForm from '../organisms/ItemSettingsForm';
import ItemPricingForm from '../organisms/ItemPricingForm';
import ItemPackageConversionManager from '../organisms/ItemPackageConversionForm';
import ImageUploader from '@/components/image-manager';
import Button from '@/components/button';

interface CollapsibleSectionProps {
  isExpanded: boolean;
  onExpand: () => void;
  stackClassName?: string;
  stackStyle?: React.CSSProperties;
  itemId?: string;
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

const areImageSlotsEqual = (
  left: Array<{ url: string; path: string }>,
  right: Array<{ url: string; path: string }>
) =>
  left.length === right.length &&
  left.every(
    (slot, index) =>
      slot.url === right[index]?.url && slot.path === right[index]?.path
  );

const updateItemFields = async (
  itemId: string,
  updates: Record<string, unknown>
) => {
  const { error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', itemId);
  if (error) throw error;
};

const normalizeNullableValue = (value: string) => (value ? value : null);
const appendCacheBust = (url: string, token: string | number) =>
  url.includes('?') ? `${url}&t=${token}` : `${url}?t=${token}`;

const useDebouncedAutosave = ({
  itemId,
  isEditMode,
  isViewingOldVersion,
  delayMs = 600,
}: {
  itemId?: string;
  isEditMode: boolean;
  isViewingOldVersion: boolean;
  delayMs?: number;
}) => {
  const timersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(timerId => {
        window.clearTimeout(timerId);
      });
      timersRef.current = {};
    };
  }, []);

  return useCallback(
    (field: string, value: unknown) => {
      if (!itemId || !isEditMode || isViewingOldVersion) return;

      const existing = timersRef.current[field];
      if (existing) window.clearTimeout(existing);

      timersRef.current[field] = window.setTimeout(() => {
        void updateItemFields(itemId, { [field]: value }).catch(error => {
          console.error('Error autosaving item input:', error);
          toast.error('Gagal menyimpan perubahan.');
        });
      }, delayMs);
    },
    [itemId, isEditMode, isViewingOldVersion, delayMs]
  );
};

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

const BasicInfoRequiredSection: React.FC<BasicInfoRequiredProps> = ({
  itemId,
}) => {
  const {
    formData,
    categories,
    types,
    packages,
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
  } = useItemModal();

  const saveDropdownUpdate = useCallback(
    (updates: Record<string, unknown>) => {
      if (!itemId || !isEditMode || isViewingOldVersion) return;
      void updateItemFields(itemId, updates).catch(error => {
        console.error('Error autosaving item dropdown:', error);
        toast.error('Gagal menyimpan perubahan.');
      });
    },
    [itemId, isEditMode, isViewingOldVersion]
  );
  const scheduleAutosave = useDebouncedAutosave({
    itemId,
    isEditMode,
    isViewingOldVersion,
  });

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

  const handleFieldChange = (field: string, value: boolean | string) => {
    if (field === 'is_medicine' && value === false) {
      saveDropdownUpdate({
        is_medicine: false,
        has_expiry_date: false,
      });
      updateFormData({
        is_medicine: value as boolean,
        has_expiry_date: false,
      });
    } else if (field === 'is_medicine') {
      saveDropdownUpdate({ is_medicine: value as boolean });
      updateFormData({ is_medicine: value as boolean });
    } else if (field === 'code') {
      updateFormData({ code: value as string });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    handleChange(e);

    const { name, value } = e.target;
    if (name === 'name') {
      scheduleAutosave('name', value);
    }
  };

  const handleDropdownChange = (field: string, value: string) => {
    const normalizedValue = normalizeNullableValue(value);

    if (field === 'category_id') {
      updateFormData({ category_id: value });
      saveDropdownUpdate({ category_id: normalizedValue });
    } else if (field === 'type_id') {
      updateFormData({ type_id: value });
      saveDropdownUpdate({ type_id: normalizedValue });
    } else if (field === 'package_id') {
      updateFormData({ package_id: value });
      // Also update baseUnit for unit conversion synchronization
      const selectedPackage = packages.find(pkg => pkg.id === value);
      const nextBaseUnit = selectedPackage?.name ?? null;
      if (selectedPackage) {
        packageConversionHook.setBaseUnit(selectedPackage.name);
      }
      saveDropdownUpdate({
        package_id: normalizedValue,
        base_unit: nextBaseUnit,
      });
    } else if (field === 'dosage_id') {
      updateFormData({ dosage_id: value });
      saveDropdownUpdate({ dosage_id: normalizedValue });
    } else if (field === 'manufacturer_id') {
      updateFormData({ manufacturer_id: value });
      saveDropdownUpdate({ manufacturer_id: normalizedValue });
    }
  };

  return (
    <ItemBasicInfoForm
      key={resetKey} // Force re-mount on reset to clear validation
      isEditMode={isEditMode}
      formData={{
        code: formData.code || '',
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
      onChange={handleInputChange}
      onFieldChange={handleFieldChange}
      onDropdownChange={handleDropdownChange}
      onAddNewCategory={handleAddNewCategory}
      onAddNewType={handleAddNewType}
      onAddNewUnit={handleAddNewUnit}
      onAddNewDosage={handleAddNewDosage}
      onAddNewManufacturer={handleAddNewManufacturer}
    />
  );
};

// Settings Section

const SettingsSection: React.FC<CollapsibleSectionProps> = ({
  isExpanded,
  onExpand,
  stackClassName,
  stackStyle,
  itemId,
}) => {
  const { formData, updateFormData } = useItemForm();
  const { isViewingOldVersion, isEditMode } = useItemUI();
  const scheduleAutosave = useDebouncedAutosave({
    itemId,
    isEditMode,
    isViewingOldVersion,
  });

  const minStockEditor = useInlineEditor({
    initialValue: (formData.min_stock || 0).toString(),
    onSave: value => {
      const parsedValue = parseInt(value.toString()) || 0;
      updateFormData({ min_stock: parsedValue });
      scheduleAutosave('min_stock', parsedValue);
    },
  });

  const saveDropdownUpdate = useCallback(
    (updates: Record<string, unknown>) => {
      if (!itemId || !isEditMode || isViewingOldVersion) return;
      void updateItemFields(itemId, updates).catch(error => {
        console.error('Error autosaving item dropdown:', error);
        toast.error('Gagal menyimpan perubahan.');
      });
    },
    [itemId, isEditMode, isViewingOldVersion]
  );

  const handleFieldChange = (field: string, value: boolean | string) => {
    if (field === 'is_medicine' && value === false) {
      updateFormData({
        is_medicine: value as boolean,
        has_expiry_date: false,
      });
    } else if (field === 'is_medicine') {
      updateFormData({ is_medicine: value as boolean });
    } else if (field === 'is_active') {
      saveDropdownUpdate({ is_active: value as boolean });
      updateFormData({ is_active: value as boolean });
    } else if (field === 'has_expiry_date') {
      saveDropdownUpdate({ has_expiry_date: value as boolean });
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
  itemId,
}) => {
  const { formData, updateFormData, handleChange } = useItemForm();
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

  const { resetKey, isViewingOldVersion, isEditMode } = useItemUI();
  const scheduleAutosave = useDebouncedAutosave({
    itemId,
    isEditMode,
    isViewingOldVersion,
  });

  useEffect(() => {
    onLevelPricingToggle?.(showLevelPricing);
  }, [onLevelPricingToggle, showLevelPricing]);

  const handlePricingExpand = useCallback(() => {
    if (showLevelPricing && isExpanded) {
      setShowLevelPricing(false);
    }
    onExpand();
  }, [isExpanded, onExpand, showLevelPricing]);

  const { calculateProfitPercentage: calcMargin } = useItemPriceCalculations({
    basePrice: formData.base_price || 0,
    sellPrice: formData.sell_price || 0,
  });

  const marginEditor = useInlineEditor({
    initialValue: (calcMargin || 0).toString(),
    onSave: value => {
      const basePrice = formData.base_price || 0;
      const marginPercentage = parseFloat(value.toString()) || 0;
      const newSellPrice = basePrice + (basePrice * marginPercentage) / 100;
      updateFormData({ sell_price: newSellPrice });
    },
  });

  const handleSellPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Extract numeric value from currency format (e.g., "Rp 123" -> "123")
    const cleanValue = e.target.value
      .replace(/^Rp\s*/, '')
      .replace(/[^0-9]/g, '');
    const value = parseFloat(cleanValue) || 0;
    updateFormData({ sell_price: value });
    marginEditor.setValue((calcMargin || 0).toString());
    scheduleAutosave('sell_price', value);
  };

  const handleBasePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    scheduleAutosave('base_price', extractNumericValue(e.target.value));
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
        base_price: formData.base_price || 0,
        sell_price: formData.sell_price || 0,
        is_level_pricing_active: formData.is_level_pricing_active ?? true,
      }}
      displayBasePrice={displayBasePrice}
      displaySellPrice={displaySellPrice}
      baseUnit={packageConversionHook.baseUnit}
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
      onBasePriceChange={handleBasePriceChange}
      onSellPriceChange={handleSellPriceChange}
      onMarginChange={marginEditor.setValue}
      onStartEditMargin={marginEditor.startEditing}
      onStopEditMargin={marginEditor.stopEditing}
      onMarginInputChange={marginEditor.handleChange}
      onMarginKeyDown={marginEditor.handleKeyDown}
      isLevelPricingActive={formData.is_level_pricing_active ?? true}
      onLevelPricingActiveChange={active => {
        updateFormData({ is_level_pricing_active: active });
        scheduleAutosave('is_level_pricing_active', active);
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
  itemId,
}) => {
  const { packageConversionHook } = useItemPrice();
  const { resetKey, isViewingOldVersion, isEditMode } = useItemUI();
  const { setInitialPackageConversions } = useItemForm();
  const realtime = useItemRealtime();
  const smartFormSync = realtime?.smartFormSync;
  const pendingAutosaveRef = useRef(false);

  const packageConversionLogic = usePackageConversionLogic({
    conversions: packageConversionHook.conversions,
    availableUnits: packageConversionHook.availableUnits,
    formData: packageConversionHook.packageConversionFormData,
    addPackageConversion: packageConversionHook.addPackageConversion,
    setFormData: packageConversionHook.setPackageConversionFormData,
    baseUnit: packageConversionHook.baseUnit,
  });

  const handleAddConversion = () => {
    const result = packageConversionLogic.validateAndAddConversion();
    if (!result.success && result.error) {
      return;
    }
    pendingAutosaveRef.current = true;
  };

  const persistConversions = useCallback(async () => {
    if (!itemId || !isEditMode || isViewingOldVersion) return;

    const payload = packageConversionHook.conversions.map(conversion => ({
      unit_name: conversion.unit.name,
      to_unit_id: conversion.to_unit_id,
      conversion_rate: conversion.conversion_rate,
      base_price: conversion.base_price,
      sell_price: conversion.sell_price,
    }));

    try {
      await updateItemFields(itemId, { package_conversions: payload });
      setInitialPackageConversions(packageConversionHook.conversions);
    } catch (error) {
      console.error('Error autosaving item conversions:', error);
    }
  }, [
    itemId,
    isEditMode,
    isViewingOldVersion,
    packageConversionHook.conversions,
    setInitialPackageConversions,
  ]);

  useEffect(() => {
    if (!pendingAutosaveRef.current) return;
    pendingAutosaveRef.current = false;
    void persistConversions();
  }, [persistConversions, packageConversionHook.conversions]);

  const handleConversionInteractionStart = useCallback(() => {
    smartFormSync?.registerActiveField('package_conversions');
  }, [smartFormSync]);

  const handleConversionInteractionEnd = useCallback(() => {
    smartFormSync?.unregisterActiveField('package_conversions');
  }, [smartFormSync]);

  const handleRemoveConversion = useCallback(
    (id: string) => {
      pendingAutosaveRef.current = true;
      packageConversionHook.removePackageConversion(id);
    },
    [packageConversionHook]
  );

  return (
    <ItemPackageConversionManager
      key={resetKey} // Force re-mount on reset to clear validation and input states
      baseUnit={packageConversionHook.baseUnit}
      availableUnits={packageConversionHook.availableUnits}
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
      onUpdateSellPrice={(id, sellPrice) =>
        packageConversionHook.setConversions(prevConversions => {
          pendingAutosaveRef.current = true;
          return prevConversions.map(conversion =>
            conversion.id === id
              ? { ...conversion, sell_price: sellPrice }
              : conversion
          );
        })
      }
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
  const { formData, units, loading, handleChange, updateFormData } =
    useItemForm();
  const { resetKey, isViewingOldVersion, isEditMode } = useItemUI();
  const queryClient = useQueryClient();
  const cacheKey = itemId ? `item-images:${itemId}` : null;
  const buildSlotsFromUrlsWithItem = useCallback(
    (urls: string[]) =>
      Array.from({ length: 4 }, (_, index) => {
        const url = urls[index] || '';
        return {
          url,
          path: url && itemId ? `items/${itemId}/slot-${index}` : '',
        };
      }),
    [itemId]
  );
  const [imageSlots, setImageSlots] = useState(
    Array.from({ length: 4 }, () => ({ url: '', path: '' }))
  );
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [uploadingSlots, setUploadingSlots] = useState<boolean[]>(
    Array.from({ length: 4 }, () => false)
  );
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
  const localPreviewUrlsRef = useRef<Record<number, string>>({});

  const bucketName = 'item_images';
  const maxFileSizeBytes = 1 * 1024 * 1024;
  const maxFileSizeLabel = '1MB';
  const formImageUrls = useMemo(
    () => (Array.isArray(formData.image_urls) ? formData.image_urls : []),
    [formData.image_urls]
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
      const cropperInstance = new Cropper(imageElement, {
        aspectRatio: 1,
        viewMode: 1,
        autoCropArea: 1,
        background: false,
        responsive: true,
        guides: true,
      });

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

  const transformedUnits = units.map(unit => ({
    id: unit.id,
    name: unit.name,
    code: unit.code,
    description: unit.description,
    updated_at: unit.updated_at,
  }));

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

  const setSlotUploading = useCallback((slotIndex: number, value: boolean) => {
    setUploadingSlots(prev => {
      if (prev[slotIndex] === value) return prev;
      const next = [...prev];
      next[slotIndex] = value;
      return next;
    });
  }, []);

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
      setImageSlots(prevSlots =>
        prevSlots.map((slot, index) =>
          index === slotIndex ? { ...slot, url: objectUrl } : slot
        )
      );
    },
    []
  );

  useEffect(() => {
    let isActive = true;

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

      if (isActive) {
        setDisplayUrls(results);
      }
    };

    resolveDisplayUrls();

    return () => {
      isActive = false;
    };
  }, [imageSlots]);

  useEffect(() => {
    return () => {
      Object.values(localPreviewUrlsRef.current).forEach(url => {
        URL.revokeObjectURL(url);
      });
      localPreviewUrlsRef.current = {};
    };
  }, []);

  const updateItemImagesInDatabase = useCallback(
    async (urls: string[]) => {
      if (!itemId) return;
      await supabase
        .from('items')
        .update({ image_urls: urls })
        .eq('id', itemId);
      updateFormData({ image_urls: urls });
      queryClient.setQueriesData(
        { queryKey: QueryKeys.items.all },
        (cachedData: unknown) => {
          if (!cachedData) return cachedData;
          if (Array.isArray(cachedData)) {
            return cachedData.map(item =>
              item &&
              typeof item === 'object' &&
              'id' in item &&
              item.id === itemId
                ? { ...item, image_urls: urls }
                : item
            );
          }
          if (
            typeof cachedData === 'object' &&
            cachedData !== null &&
            'id' in cachedData &&
            cachedData.id === itemId
          ) {
            return { ...cachedData, image_urls: urls };
          }
          return cachedData;
        }
      );
    },
    [itemId, queryClient, updateFormData]
  );

  const buildImageUrlsPayload = useCallback((slots: Array<{ url: string }>) => {
    const urls = slots.map(slot => slot.url || '');
    return urls.some(Boolean) ? urls : [];
  }, []);

  const handleBrokenImage = useCallback(
    (slotIndex: number, url: string) => {
      setImageSlots(prevSlots => {
        const nextSlots = prevSlots.map((slot, index) =>
          index === slotIndex ? { path: '', url: '' } : slot
        );
        updateImageCache(nextSlots);
        if (itemId && !isViewingOldVersion && url.startsWith('http')) {
          updateItemImagesInDatabase(buildImageUrlsPayload(nextSlots));
        }
        return nextSlots;
      });
    },
    [
      buildImageUrlsPayload,
      itemId,
      isViewingOldVersion,
      updateImageCache,
      updateItemImagesInDatabase,
    ]
  );

  useEffect(() => {
    if (!itemId) return;

    if (loading) {
      return;
    }

    if (formImageUrls.length > 0) {
      const nextSlots = buildSlotsFromUrls(formImageUrls);
      setImageSlots(nextSlots);
      updateImageCache(nextSlots);
      setIsLoadingImages(false);
      return;
    }

    let isMounted = true;

    const loadItemImages = async () => {
      setIsLoadingImages(true);
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(`items/${itemId}`, {
          limit: 20,
          sortBy: { column: 'name', order: 'asc' },
        });

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
      await updateItemImagesInDatabase(buildImageUrlsPayload(nextSlots));
      setIsLoadingImages(false);
    };

    loadItemImages();

    return () => {
      isMounted = false;
    };
  }, [
    buildImageUrlsPayload,
    bucketName,
    buildSlotsFromUrls,
    cacheKey,
    formImageUrls,
    itemId,
    loading,
    updateImageCache,
    updateItemImagesInDatabase,
  ]);

  useEffect(() => {
    if (!itemId || loading) return;

    const nextSlots = buildSlotsFromUrls(formImageUrls);
    setImageSlots(prevSlots =>
      areImageSlotsEqual(prevSlots, nextSlots) ? prevSlots : nextSlots
    );
    updateImageCache(nextSlots);
    setIsLoadingImages(false);
  }, [buildSlotsFromUrls, formImageUrls, itemId, loading, updateImageCache]);

  const saveDropdownUpdate = useCallback(
    (updates: Record<string, unknown>) => {
      if (!itemId || !isEditMode || isViewingOldVersion) return;
      void updateItemFields(itemId, updates).catch(error => {
        console.error('Error autosaving item dropdown:', error);
        toast.error('Gagal menyimpan perubahan.');
      });
    },
    [itemId, isEditMode, isViewingOldVersion]
  );
  const scheduleAutosave = useDebouncedAutosave({
    itemId,
    isEditMode,
    isViewingOldVersion,
  });

  const handleDropdownChange = (field: string, value: string) => {
    if (field === 'unit_id') {
      updateFormData({ unit_id: value });
      saveDropdownUpdate({ unit_id: normalizeNullableValue(value) });
    }
  };

  const handleOptionalChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    handleChange(e);

    const { name, value } = e.target;
    if (name === 'barcode') {
      scheduleAutosave('barcode', value);
    } else if (name === 'quantity') {
      scheduleAutosave('quantity', parseFloat(value) || 0);
    } else if (name === 'description') {
      scheduleAutosave('description', value);
    }
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

  const processAndUploadImage = useCallback(
    async (slotIndex: number, file: File) => {
      if (!itemId) {
        toast.error('Simpan item terlebih dahulu sebelum mengunggah gambar.');
        return null;
      }

      try {
        const compressed = await compressImageIfNeeded(file);
        const normalizedFile =
          compressed instanceof File
            ? compressed
            : new File([compressed], file.name, {
                type: compressed.type || file.type,
                lastModified: Date.now(),
              });

        if (normalizedFile.size > maxFileSizeBytes) {
          toast.error(`Ukuran gambar maksimal ${maxFileSizeLabel}.`);
          return null;
        }

        const path = `items/${itemId}/slot-${slotIndex}`;
        const { error } = await supabase.storage
          .from(bucketName)
          .upload(path, normalizedFile, {
            cacheControl: '3600',
            upsert: true,
            contentType: normalizedFile.type,
          });

        if (error) {
          toast.error('Gagal mengunggah gambar.');
          return null;
        }

        const publicUrl = appendCacheBust(
          StorageService.getPublicUrl(bucketName, path),
          Date.now()
        );
        return { publicUrl, path };
      } catch {
        toast.error('Gagal memproses gambar.');
        return null;
      }
    },
    [bucketName, itemId, maxFileSizeBytes, maxFileSizeLabel]
  );

  const handleImageUpload = useCallback(
    async (slotIndex: number, file: File) => {
      if (!itemId) {
        toast.error('Simpan item terlebih dahulu sebelum mengunggah gambar.');
        return;
      }

      const previousSlot = imageSlots[slotIndex];
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

      setLocalPreviewForSlot(slotIndex, file);
      setSlotUploading(slotIndex, true);
      const uploadResult = await processAndUploadImage(slotIndex, file);
      if (!uploadResult) {
        revokeLocalPreview(slotIndex);
        setSlotUploading(slotIndex, false);
        setImageSlots(prevSlots =>
          prevSlots.map((slot, index) =>
            index === slotIndex ? previousSlot : slot
          )
        );
        return;
      }

      revokeLocalPreview(slotIndex);
      setSlotUploading(slotIndex, false);
      setImageSlots(prevSlots => {
        const nextSlots = prevSlots.map((slot, index) =>
          index === slotIndex
            ? { path: uploadResult.path, url: uploadResult.publicUrl }
            : slot
        );
        updateImageCache(nextSlots);
        updateItemImagesInDatabase(buildImageUrlsPayload(nextSlots));
        return nextSlots;
      });
    },
    [
      buildImageUrlsPayload,
      getImageDimensions,
      imageSlots,
      itemId,
      openCropper,
      processAndUploadImage,
      revokeLocalPreview,
      setLocalPreviewForSlot,
      setSlotUploading,
      updateImageCache,
      updateItemImagesInDatabase,
    ]
  );

  const handleCropConfirm = useCallback(async () => {
    if (!cropState || !cropperRef.current) return;
    setIsCropping(true);

    try {
      const canvas = cropperRef.current.getCroppedCanvas({
        width: 1024,
        height: 1024,
        imageSmoothingQuality: 'high',
      });

      const mimeType = cropState.file.type || 'image/jpeg';
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          result => {
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
      const previousSlot = imageSlots[targetSlot];
      closeCropper();
      setLocalPreviewForSlot(targetSlot, croppedFile);
      setSlotUploading(targetSlot, true);
      const uploadResult = await processAndUploadImage(targetSlot, croppedFile);
      if (!uploadResult) {
        revokeLocalPreview(targetSlot);
        setSlotUploading(targetSlot, false);
        setImageSlots(prevSlots =>
          prevSlots.map((slot, index) =>
            index === targetSlot ? previousSlot : slot
          )
        );
        return;
      }

      revokeLocalPreview(targetSlot);
      setSlotUploading(targetSlot, false);
      setImageSlots(prevSlots => {
        const nextSlots = prevSlots.map((slot, index) =>
          index === targetSlot
            ? { path: uploadResult.path, url: uploadResult.publicUrl }
            : slot
        );
        updateImageCache(nextSlots);
        updateItemImagesInDatabase(buildImageUrlsPayload(nextSlots));
        return nextSlots;
      });
    } catch {
      toast.error('Gagal memproses gambar.');
    } finally {
      setIsCropping(false);
    }
  }, [
    buildImageUrlsPayload,
    closeCropper,
    cropState,
    imageSlots,
    processAndUploadImage,
    revokeLocalPreview,
    setLocalPreviewForSlot,
    setSlotUploading,
    updateImageCache,
    updateItemImagesInDatabase,
  ]);

  const handleImageDelete = useCallback(
    async (slotIndex: number) => {
      const targetSlot = imageSlots[slotIndex];
      if (!targetSlot?.path) return;

      try {
        await StorageService.deleteFile(bucketName, targetSlot.path);
        if (targetSlot.url) {
          await removeCachedImageBlob(targetSlot.url);
        }
        setImageSlots(prevSlots => {
          const nextSlots = prevSlots.map((slot, index) =>
            index === slotIndex ? { path: '', url: '' } : slot
          );
          updateImageCache(nextSlots);
          updateItemImagesInDatabase(buildImageUrlsPayload(nextSlots));
          return nextSlots;
        });
      } catch (deleteError) {
        console.error(deleteError);
        toast.error('Gagal menghapus gambar.');
      }
    },
    [
      bucketName,
      buildImageUrlsPayload,
      imageSlots,
      updateImageCache,
      updateItemImagesInDatabase,
    ]
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
              isViewingOldVersion ||
              !itemId ||
              (isLoadingImages && Boolean(slot.url)) ||
              uploadingSlots[index]
            }
            interaction="direct"
            onImageUpload={file => handleImageUpload(index, file)}
            onImageDelete={() => handleImageDelete(index)}
            className="w-full"
            validTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
            loadingIcon={null}
          >
            {slot.url ? (
              <img
                src={
                  displayUrls[index]?.source === slot.url
                    ? displayUrls[index]?.display
                    : slot.url
                }
                alt={`Item image ${index + 1}`}
                className={`aspect-square w-full rounded-lg border border-slate-200 object-cover cursor-zoom-in ${
                  uploadingSlots[index] ? 'animate-pulse' : ''
                }`}
                style={
                  uploadingSlots[index]
                    ? { animationDuration: '2.8s' }
                    : undefined
                }
                onError={() => handleBrokenImage(index, slot.url)}
                onClick={event => {
                  event.stopPropagation();
                  setPreviewUrl(
                    displayUrls[index]?.source === slot.url
                      ? displayUrls[index]?.display
                      : slot.url
                  );
                }}
              />
            ) : (
              <div className="aspect-square w-full rounded-lg border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-400">
                {itemId ? 'Unggah' : 'Simpan dulu'}
              </div>
            )}
          </ImageUploader>
        ))}
      </div>
      {previewUrl &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setPreviewUrl(null)}
          >
            <div className="max-h-[90vh] max-w-[90vw] p-3">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-xl"
                onClick={event => event.stopPropagation()}
              />
            </div>
          </div>,
          document.body
        )}
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
          quantity: formData.quantity || 0,
          unit_id: formData.unit_id || '',
          description: formData.description || '',
        }}
        units={transformedUnits}
        loading={loading}
        isExpanded={isExpanded}
        onExpand={onExpand}
        stackClassName={stackClassName}
        stackStyle={stackStyle}
        disabled={isViewingOldVersion}
        onChange={handleOptionalChange}
        onDropdownChange={handleDropdownChange}
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
