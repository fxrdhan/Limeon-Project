import type React from 'react';
import { createPortal } from 'react-dom';
import Button from '@/components/button';
import ImageCropper, {
  type ImageCropperHandle,
} from '@/components/image-cropper';

interface ItemImageCropperDialogProps {
  imageCropperRef: React.RefObject<ImageCropperHandle | null>;
  previewUrl: string;
  isVisible: boolean;
  isCropping: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ItemImageCropperDialog = ({
  imageCropperRef,
  previewUrl,
  isVisible,
  isCropping,
  onClose,
  onConfirm,
}: ItemImageCropperDialogProps) => {
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-all duration-200 ${
        isVisible
          ? 'bg-black/70 opacity-100'
          : 'bg-black/70 opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`w-[min(72vw,calc(90vh-11rem))] min-w-[20rem] max-w-[calc(100vw-3rem)] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xl transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="px-6 pt-6 pb-5 text-base font-semibold text-slate-800">
          Crop gambar (1:1)
        </div>
        <div className="px-6 pb-6">
          <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-100">
            <ImageCropper
              ref={imageCropperRef}
              src={previewUrl}
              alt="Crop"
              aspectRatio={1}
              fitMode="aspect-fit"
            />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-6 py-5">
          <Button
            type="button"
            variant="text"
            size="md"
            onClick={onClose}
            disabled={isCropping}
          >
            Batal
          </Button>
          <Button
            type="button"
            size="md"
            onClick={onConfirm}
            isLoading={isCropping}
          >
            Simpan
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ItemImageCropperDialog;
