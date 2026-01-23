/* eslint-disable react-refresh/only-export-components */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import { supabase } from '@/lib/supabase';
import { compressImageIfNeeded } from '@/utils/image';
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

const PricingSection: React.FC<CollapsibleSectionProps> = ({
  isExpanded,
  onExpand,
}) => {
  const { formData, updateFormData, handleChange } = useItemForm();
  const { packageConversionHook, displayBasePrice, displaySellPrice } =
    useItemPrice();

  const { resetKey, isViewingOldVersion } = useItemUI();

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
      isExpanded={isExpanded}
      onExpand={onExpand}
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
}) => {
  const { formData, units, loading, handleChange, updateFormData } =
    useItemForm();
  const { resetKey, isViewingOldVersion } = useItemUI();
  const [imageSlots, setImageSlots] = useState(
    Array.from({ length: 4 }, () => ({ url: '', path: '' }))
  );
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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

  const openCropper = useCallback((slotIndex: number, file: File) => {
    const previewUrlValue = URL.createObjectURL(file);
    setCropState({ slotIndex, file, previewUrl: previewUrlValue });
  }, []);

  const closeCropper = useCallback(() => {
    if (cropState?.previewUrl) {
      URL.revokeObjectURL(cropState.previewUrl);
    }
    setCropState(null);
  }, [cropState]);

  useEffect(() => {
    if (!cropState || !cropperImageRef.current) return;

    const cropperInstance = new Cropper(cropperImageRef.current, {
      aspectRatio: 1,
      viewMode: 1,
      autoCropArea: 1,
      background: false,
      responsive: true,
      guides: true,
    });

    cropperRef.current = cropperInstance;

    return () => {
      cropperInstance.destroy();
      cropperRef.current = null;
    };
  }, [cropState]);

  const transformedUnits = units.map(unit => ({
    id: unit.id,
    name: unit.name,
    code: unit.code,
    description: unit.description,
    updated_at: unit.updated_at,
  }));

  useEffect(() => {
    if (!itemId) return;

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
      setIsLoadingImages(false);
    };

    loadItemImages();

    return () => {
      isMounted = false;
    };
  }, [bucketName, itemId]);

  const handleDropdownChange = (field: string, value: string) => {
    if (field === 'unit_id') {
      updateFormData({ unit_id: value });
    }
  };

  const getImageDimensions = useCallback((file: File) => {
    return new Promise<{ width: number; height: number }>((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({ width: image.width, height: image.height });
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Gagal memuat gambar.'));
      };
      image.src = objectUrl;
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
        setImageSlots(prevSlots =>
          prevSlots.map((slot, index) =>
            index === slotIndex ? { path, url: publicUrl } : slot
          )
        );
      } catch {
        toast.error('Gagal memproses gambar.');
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
        setImageSlots(prevSlots =>
          prevSlots.map((slot, index) =>
            index === slotIndex ? { path: '', url: '' } : slot
          )
        );
      } catch (deleteError) {
        console.error(deleteError);
        toast.error('Gagal menghapus gambar.');
      }
    },
    [bucketName, imageSlots]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-3">
        {imageSlots.map((slot, index) => (
          <ImageUploader
            key={`item-image-${index}`}
            id={`item-image-${index}`}
            shape="rounded"
            hasImage={Boolean(slot.url)}
            disabled={isViewingOldVersion || !itemId || isLoadingImages}
            onImageUpload={file => handleImageUpload(index, file)}
            onImageDelete={() => handleImageDelete(index)}
            className="w-full"
            validTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
          >
            {slot.url ? (
              <img
                src={slot.url}
                alt={`Item image ${index + 1}`}
                className="aspect-square w-full rounded-lg border border-slate-200 object-cover cursor-zoom-in"
                onClick={event => {
                  event.stopPropagation();
                  setPreviewUrl(slot.url);
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
