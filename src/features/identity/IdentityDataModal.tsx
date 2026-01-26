import React from 'react';
import { IdentityModalProvider } from '@/contexts/IdentityModalContext';
import { useIdentityModalLogic } from './hooks/useIdentityModalLogic';
import IdentityModalTemplate from '@/components/templates/IdentitylModalTemplate';
import IdentityModalContent from './components/IdentityModalContent';
import type { GenericIdentityModalProps } from '@/types';

const IdentityDataModal: React.FC<GenericIdentityModalProps> = ({
  title,
  data,
  fields,
  isOpen,
  onClose,
  onSave,
  onFieldSave,
  onImageSave,
  onImageDelete,
  imageUrl,
  defaultImageUrl,
  imagePlaceholder,
  imageUploadText = 'Unggah gambar',
  imageNotAvailableText = 'Gambar belum tersedia',
  imageFormatHint = 'Format: JPG, PNG',
  onDeleteRequest,
  deleteButtonLabel = 'Hapus',
  mode = 'edit',
  initialNameFromSearch,
  imageAspectRatio = 'default',
  showImageUploader = true,
}) => {
  const { contextValue, resetInternalState } = useIdentityModalLogic({
    title,
    data,
    fields,
    isOpen,
    onClose,
    onSave,
    onFieldSave,
    onImageSave,
    onImageDelete,
    imageUrl,
    defaultImageUrl,
    imagePlaceholder,
    imageUploadText,
    imageNotAvailableText,
    imageFormatHint,
    onDeleteRequest,
    deleteButtonLabel,
    mode,
    initialNameFromSearch,
    imageAspectRatio,
    showImageUploader,
  });

  return (
    <IdentityModalProvider value={contextValue}>
      <IdentityModalTemplate
        isOpen={isOpen}
        onClose={onClose}
        resetInternalState={resetInternalState}
      >
        <IdentityModalContent />
      </IdentityModalTemplate>
    </IdentityModalProvider>
  );
};

export default IdentityDataModal;
