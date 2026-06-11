import { TbPhotoUp } from 'react-icons/tb';
import ImageUploader from '@/components/image-manager';
import type { ItemImageSlot } from './itemImageSectionUtils';

interface ItemImageGridProps {
  imageSlots: ItemImageSlot[];
  isViewingOldVersion: boolean;
  isLoadingImages: boolean;
  isPopupSuppressed: boolean;
  imageTabIndexMap: Record<number, number>;
  getDisplayUrlForSlot: (slot: ItemImageSlot, index: number) => string;
  onImageUpload: (slotIndex: number, file: File) => void;
  onImageDelete: (slotIndex: number) => void;
  onBrokenImage: (slotIndex: number) => void;
  onPreviewOpen: (slotIndex: number) => void;
}

const ItemImageGrid = ({
  imageSlots,
  isViewingOldVersion,
  isLoadingImages,
  isPopupSuppressed,
  imageTabIndexMap,
  getDisplayUrlForSlot,
  onImageUpload,
  onImageDelete,
  onBrokenImage,
  onPreviewOpen,
}: ItemImageGridProps) => {
  return (
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
          isPopupSuppressed={isPopupSuppressed}
          onImageUpload={file => onImageUpload(index, file)}
          onImageDelete={() => onImageDelete(index)}
          className="w-full"
          validTypes={['image/png', 'image/jpeg', 'image/jpg', 'image/webp']}
          loadingIcon={null}
          tabIndex={imageTabIndexMap[index]}
        >
          {slot.url ? (
            <button
              type="button"
              className="block w-full rounded-xl"
              onClick={event => {
                event.stopPropagation();
                onPreviewOpen(index);
              }}
              tabIndex={-1}
              aria-label={`Preview gambar item ${index + 1}`}
            >
              <img
                src={getDisplayUrlForSlot(slot, index)}
                alt={`Item ${index + 1}`}
                className="aspect-square w-full rounded-xl border border-slate-200 object-cover cursor-zoom-in transition duration-200 group-hover:brightness-95 group-focus-visible:brightness-95"
                onError={() => onBrokenImage(index)}
              />
            </button>
          ) : (
            <div className="aspect-square w-full rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 transition duration-200 group-hover:bg-slate-100 group-focus-visible:bg-slate-100">
              <TbPhotoUp className="h-6 w-6" />
              <span className="sr-only">Unggah gambar</span>
            </div>
          )}
        </ImageUploader>
      ))}
    </div>
  );
};

export default ItemImageGrid;
