import React, { useMemo } from 'react';
import {
  useItemForm,
  useItemUI,
} from '../../../shared/contexts/useItemFormContext';
import ItemAdditionalInfoForm from '../../organisms/ItemAdditionalInfoForm';
import ItemImageCropperDialog from './ItemImageCropperDialog';
import ItemImageGrid from './ItemImageGrid';
import ItemImagePreviewDialog from './ItemImagePreviewDialog';
import type { OptionalSectionProps } from './types';
import { useItemImageSection } from './useItemImageSection';

const BasicInfoOptionalSection: React.FC<OptionalSectionProps> = ({
  isExpanded,
  onExpand,
  itemId,
  stackClassName,
  stackStyle,
}) => {
  const { formData, loading, handleChange, updateFormData } = useItemForm();
  const { resetKey, isViewingOldVersion, isEditMode } = useItemUI();
  const formImageUrls = useMemo(
    () => (Array.isArray(formData.image_urls) ? formData.image_urls : []),
    [formData.image_urls]
  );
  const {
    imageSlots,
    isLoadingImages,
    previewSlotIndex,
    previewImageUrl,
    isPreviewVisible,
    cropState,
    isCropperVisible,
    isCropping,
    imageCropperRef,
    imageTabIndexMap,
    getDisplayUrlForSlot,
    handleImageUpload,
    handleImageDelete,
    handleBrokenImage,
    openPreview,
    closePreview,
    closeCropper,
    handleCropConfirm,
  } = useItemImageSection({
    itemId,
    isEditMode,
    loading,
    formImageUrls,
    updateFormData,
  });

  const handleOptionalChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    handleChange(e);
  };

  return (
    <div className="flex flex-col gap-4">
      <ItemImageGrid
        imageSlots={imageSlots}
        isViewingOldVersion={isViewingOldVersion}
        isLoadingImages={isLoadingImages}
        isPopupSuppressed={Boolean(previewSlotIndex !== null || cropState)}
        imageTabIndexMap={imageTabIndexMap}
        getDisplayUrlForSlot={getDisplayUrlForSlot}
        onImageUpload={(slotIndex, file) =>
          void handleImageUpload(slotIndex, file)
        }
        onImageDelete={slotIndex => void handleImageDelete(slotIndex)}
        onBrokenImage={handleBrokenImage}
        onPreviewOpen={openPreview}
      />
      {previewSlotIndex !== null && previewImageUrl ? (
        <ItemImagePreviewDialog
          slotIndex={previewSlotIndex}
          previewImageUrl={previewImageUrl}
          isVisible={isPreviewVisible}
          onClose={closePreview}
          onImageUpload={(slotIndex, file) =>
            void handleImageUpload(slotIndex, file)
          }
          onImageDelete={slotIndex => void handleImageDelete(slotIndex)}
        />
      ) : null}
      {cropState ? (
        <ItemImageCropperDialog
          imageCropperRef={imageCropperRef}
          previewUrl={cropState.previewUrl}
          isVisible={isCropperVisible}
          isCropping={isCropping}
          onClose={closeCropper}
          onConfirm={() => void handleCropConfirm()}
        />
      ) : null}
      <ItemAdditionalInfoForm
        key={resetKey}
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

export default BasicInfoOptionalSection;
