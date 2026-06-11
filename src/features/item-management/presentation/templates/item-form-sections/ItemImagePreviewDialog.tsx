import ImageUploader from '@/components/image-manager';
import ImageExpandPreview from '@/components/shared/image-expand-preview';

interface ItemImagePreviewDialogProps {
  slotIndex: number;
  previewImageUrl: string;
  isVisible: boolean;
  onClose: () => void;
  onImageUpload: (slotIndex: number, file: File) => void;
  onImageDelete: (slotIndex: number) => void;
}

const ItemImagePreviewDialog = ({
  slotIndex,
  previewImageUrl,
  isVisible,
  onClose,
  onImageUpload,
  onImageDelete,
}: ItemImagePreviewDialogProps) => {
  return (
    <ImageExpandPreview
      isOpen={true}
      isVisible={isVisible}
      onClose={onClose}
      backdropClassName="z-[70] px-4 py-6"
      contentClassName="max-h-[92vh] max-w-[92vw] p-0"
      backdropRole="button"
      backdropTabIndex={0}
      backdropAriaLabel="Tutup preview gambar"
    >
      <ImageUploader
        key={`preview-${slotIndex}`}
        id={`item-image-preview-${slotIndex}`}
        shape="square"
        hasImage={true}
        onPopupClose={onClose}
        className="max-h-[92vh] max-w-[92vw]"
        popupTrigger="click"
        onImageUpload={file => {
          onClose();
          onImageUpload(slotIndex, file);
        }}
        onImageDelete={() => {
          onClose();
          onImageDelete(slotIndex);
        }}
        validTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
      >
        <img
          src={previewImageUrl}
          alt="Preview"
          className="max-h-[92vh] max-w-[92vw] object-contain shadow-xl"
        />
      </ImageUploader>
    </ImageExpandPreview>
  );
};

export default ItemImagePreviewDialog;
