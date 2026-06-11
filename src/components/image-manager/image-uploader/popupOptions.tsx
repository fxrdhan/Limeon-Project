import type React from 'react';
import { TbPhotoEdit, TbTrash, TbUpload, TbX } from 'react-icons/tb';

export interface ImageUploaderPopupOption {
  action: () => void;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
}

export const getImageUploaderPopupOptions = ({
  closePortal,
  handleDeleteImage,
  handleUploadClick,
  hasImage,
  isDeleting,
  isUploading,
  onImageDelete,
  onPopupClose,
}: {
  closePortal: () => void;
  handleDeleteImage: () => void;
  handleUploadClick: () => void;
  hasImage: boolean;
  isDeleting: boolean;
  isUploading: boolean;
  onImageDelete?: () => Promise<void> | void;
  onPopupClose?: () => void;
}): ImageUploaderPopupOption[] => {
  const disabled = isUploading || isDeleting;

  if (!hasImage) {
    return [
      {
        label: 'Upload',
        icon: <TbUpload className="h-4 w-4" />,
        action: handleUploadClick,
        disabled,
      },
    ];
  }

  const options: ImageUploaderPopupOption[] = [];

  if (onPopupClose) {
    options.push({
      label: 'Tutup',
      icon: <TbX className="h-4 w-4" />,
      action: () => {
        closePortal();
        onPopupClose();
      },
      disabled,
    });
  }

  options.push(
    {
      label: 'Edit',
      icon: <TbPhotoEdit className="-ml-px h-4.5 w-4.5" />,
      action: handleUploadClick,
      disabled,
    },
    {
      label: 'Hapus',
      icon: <TbTrash className="h-4 w-4" />,
      action: onImageDelete
        ? handleDeleteImage
        : () => {
            alert('Fitur hapus gambar belum tersedia untuk komponen ini');
          },
      disabled,
    }
  );

  return options;
};
