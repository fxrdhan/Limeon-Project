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
import {
  cacheImageBlob,
  getCachedImageSet,
  getCachedImageBlobUrl,
  preloadImages,
  setCachedImageSet,
} from '@/utils/imageCache';
import { StorageService } from '@/utils/storage';
import {
  useItemForm,
  useItemModal,
  useItemPrice,
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

const BasicInfoRequiredSection: React.FC = () => {
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

  const handleDropdownChange = (field: string, value: string) => {
    if (field === 'category_id') {
      updateFormData({ category_id: value });
    } else if (field === 'type_id') {
      updateFormData({ type_id: value });
    } else if (field === 'package_id') {
      updateFormData({ package_id: value });
      // Also update baseUnit for unit conversion synchronization
      const selectedPackage = packages.find(pkg => pkg.id === value);
      if (selectedPackage) {
        packageConversionHook.setBaseUnit(selectedPackage.name);
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
      onChange={handleChange}
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
}) => {
  const { formData, updateFormData } = useItemForm();
  const { isViewingOldVersion } = useItemUI();

  const minStockEditor = useInlineEditor({
    initialValue: (formData.min_stock || 0).toString(),
    onSave: value => {
      updateFormData({ min_stock: parseInt(value.toString()) || 0 });
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
    />
  );
};

// Pricing Section

const PricingSection: React.FC<PricingSectionProps> = ({
  isExpanded,
  onExpand,
  stackClassName,
  stackStyle,
  itemId,
  onLevelPricingToggle,
}) => {
  const { formData, updateFormData, handleChange } = useItemForm();
  const { packageConversionHook, displayBasePrice, displaySellPrice } =
    useItemPrice();

  const {
    levels,
    isLoading: isCustomerLevelsLoading,
    createLevel,
  } = useCustomerLevels();
  const [showLevelPricing, setShowLevelPricing] = useState(false);

  const { resetKey, isViewingOldVersion, isEditMode } = useItemUI();

  useEffect(() => {
    if (!isExpanded && showLevelPricing) {
      setShowLevelPricing(false);
    }
  }, [isExpanded, showLevelPricing]);

  useEffect(() => {
    onLevelPricingToggle?.(showLevelPricing);
  }, [onLevelPricingToggle, showLevelPricing]);

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
    async (levelId: string, value: string) => {
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

      if (!itemId || !isEditMode || isViewingOldVersion) {
        return;
      }

      try {
        if (trimmedValue === '') {
          const { error } = await supabase
            .from('customer_level_discounts')
            .delete()
            .eq('item_id', itemId)
            .eq('customer_level_id', levelId);

          if (error) throw error;
          return;
        }

        const { error } = await supabase
          .from('customer_level_discounts')
          .upsert(
            {
              item_id: itemId,
              customer_level_id: levelId,
              discount_percentage: normalizedValue,
            },
            { onConflict: 'item_id,customer_level_id' }
          );

        if (error) throw error;
      } catch (error) {
        console.error('Error updating customer level discount:', error);
        toast.error('Gagal memperbarui diskon level pelanggan.');
      }
    },
    [
      customerLevelDiscounts,
      isEditMode,
      isViewingOldVersion,
      itemId,
      updateFormData,
    ]
  );

  return (
    <ItemPricingForm
      key={resetKey} // Force re-mount on reset to clear validation
      formData={{
        base_price: formData.base_price || 0,
        sell_price: formData.sell_price || 0,
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
            }
          : undefined
      }
      isExpanded={isExpanded}
      onExpand={onExpand}
      stackClassName={stackClassName}
      stackStyle={stackStyle}
      disabled={isViewingOldVersion}
      onBasePriceChange={handleChange}
      onSellPriceChange={handleSellPriceChange}
      onMarginChange={marginEditor.setValue}
      onStartEditMargin={marginEditor.startEditing}
      onStopEditMargin={marginEditor.stopEditing}
      onMarginInputChange={marginEditor.handleChange}
      onMarginKeyDown={marginEditor.handleKeyDown}
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
  const { packageConversionHook } = useItemPrice();
  const { resetKey, isViewingOldVersion } = useItemUI();

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
      // Show validation errors to user - unit selection is now handled by dropdown validation
      if (result.error !== 'Silakan pilih kemasan!') {
        toast.error(result.error);
      }
    }
  };

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
      onRemoveConversion={packageConversionHook.removePackageConversion}
      onUpdateSellPrice={(id, sellPrice) =>
        packageConversionHook.setConversions(prevConversions =>
          prevConversions.map(conversion =>
            conversion.id === id
              ? { ...conversion, sell_price: sellPrice }
              : conversion
          )
        )
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
  const { resetKey, isViewingOldVersion } = useItemUI();
  const [imageSlots, setImageSlots] = useState(
    Array.from({ length: 4 }, () => ({ url: '', path: '' }))
  );
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [displayUrls, setDisplayUrls] = useState<string[]>([]);
  const [cropState, setCropState] = useState<{
    slotIndex: number;
    file: File;
    previewUrl: string;
  } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const cropperRef = useRef<Cropper | null>(null);
  const cropperImageRef = useRef<HTMLImageElement | null>(null);

  const bucketName = 'item_images';
  const maxFileSizeBytes = 500 * 1024 * 1024;
  const maxFileSizeLabel = '500MB';
  const cacheKey = itemId ? `item-images:${itemId}` : null;
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

  const buildSlotsFromUrls = useCallback(
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

  const updateImageCache = useCallback(
    (slots: Array<{ url: string }>) => {
      if (!cacheKey) return;
      const urls = slots.map(slot => slot.url);
      setCachedImageSet(cacheKey, urls);
      preloadImages(urls.filter(Boolean));
    },
    [cacheKey]
  );

  useEffect(() => {
    let isActive = true;

    const resolveDisplayUrls = async () => {
      const results = await Promise.all(
        imageSlots.map(async slot => {
          if (!slot.url) return '';
          if (!slot.url.startsWith('http')) return slot.url;
          const cachedBlobUrl = await getCachedImageBlobUrl(slot.url);
          if (cachedBlobUrl) return cachedBlobUrl;
          const blobUrl = await cacheImageBlob(slot.url);
          return blobUrl || slot.url;
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

  const updateItemImagesInDatabase = useCallback(
    async (urls: string[]) => {
      if (!itemId) return;
      await supabase
        .from('items')
        .update({ image_urls: urls })
        .eq('id', itemId);
      updateFormData({ image_urls: urls });
    },
    [itemId, updateFormData]
  );

  useEffect(() => {
    if (!itemId) return;

    const cachedUrls = cacheKey ? getCachedImageSet(cacheKey) : null;
    if (cachedUrls) {
      const nextSlots = buildSlotsFromUrls(cachedUrls);
      setImageSlots(nextSlots);
      preloadImages(cachedUrls.filter(Boolean));
      setIsLoadingImages(false);
      return;
    }

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
        nextSlots[slotIndex] = {
          path,
          url: StorageService.getPublicUrl(bucketName, path),
        };
      });

      setImageSlots(nextSlots);
      updateImageCache(nextSlots);
      await updateItemImagesInDatabase(
        nextSlots.map(slot => slot.url).filter(Boolean)
      );
      setIsLoadingImages(false);
    };

    loadItemImages();

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
    updateItemImagesInDatabase,
  ]);

  const handleDropdownChange = (field: string, value: string) => {
    if (field === 'unit_id') {
      updateFormData({ unit_id: value });
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
        return;
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
          return;
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
          return;
        }

        const publicUrl = StorageService.getPublicUrl(bucketName, path);
        setImageSlots(prevSlots => {
          const nextSlots = prevSlots.map((slot, index) =>
            index === slotIndex ? { path, url: publicUrl } : slot
          );
          updateImageCache(nextSlots);
          updateItemImagesInDatabase(
            nextSlots.map(nextSlot => nextSlot.url).filter(Boolean)
          );
          return nextSlots;
        });
      } catch {
        toast.error('Gagal memproses gambar.');
      }
    },
    [
      bucketName,
      itemId,
      maxFileSizeBytes,
      maxFileSizeLabel,
      updateImageCache,
      updateItemImagesInDatabase,
    ]
  );

  const handleImageUpload = useCallback(
    async (slotIndex: number, file: File) => {
      if (!itemId) {
        toast.error('Simpan item terlebih dahulu sebelum mengunggah gambar.');
        return;
      }

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

      await processAndUploadImage(slotIndex, file);
    },
    [getImageDimensions, itemId, openCropper, processAndUploadImage]
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
      closeCropper();
      await processAndUploadImage(targetSlot, croppedFile);
    } catch {
      toast.error('Gagal memproses gambar.');
    } finally {
      setIsCropping(false);
    }
  }, [closeCropper, cropState, processAndUploadImage]);

  const handleImageDelete = useCallback(
    async (slotIndex: number) => {
      const targetSlot = imageSlots[slotIndex];
      if (!targetSlot?.path) return;

      try {
        await StorageService.deleteFile(bucketName, targetSlot.path);
        setImageSlots(prevSlots => {
          const nextSlots = prevSlots.map((slot, index) =>
            index === slotIndex ? { path: '', url: '' } : slot
          );
          updateImageCache(nextSlots);
          updateItemImagesInDatabase(
            nextSlots.map(nextSlot => nextSlot.url).filter(Boolean)
          );
          return nextSlots;
        });
      } catch (deleteError) {
        console.error(deleteError);
        toast.error('Gagal menghapus gambar.');
      }
    },
    [bucketName, imageSlots, updateImageCache, updateItemImagesInDatabase]
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
            disabled={isViewingOldVersion || !itemId || isLoadingImages}
            interaction="direct"
            onImageUpload={file => handleImageUpload(index, file)}
            onImageDelete={() => handleImageDelete(index)}
            className="w-full"
            validTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
          >
            {slot.url ? (
              <img
                src={displayUrls[index] || slot.url}
                alt={`Item image ${index + 1}`}
                className="aspect-square w-full rounded-lg border border-slate-200 object-cover cursor-zoom-in"
                onClick={event => {
                  event.stopPropagation();
                  setPreviewUrl(displayUrls[index] || slot.url);
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
        onChange={handleChange}
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
