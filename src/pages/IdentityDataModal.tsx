import React from "react";
import { DetailModalProvider } from "@/contexts/DetailModalContext";
import { useDetailModalLogic } from "@/hooks/useDetailModalLogic";
import DetailModalTemplate from "@/components/templates/DetailModalTemplate";
import DetailModalContent from "@/components/organisms/DetailModalContent";
import type { GenericDetailModalProps } from "@/types";

const IdentityDataModal: React.FC<GenericDetailModalProps> = ({
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
  imageUploadText = "Unggah gambar",
  imageNotAvailableText = "Gambar belum tersedia",
  imageFormatHint = "Format: JPG, PNG",
  onDeleteRequest,
  deleteButtonLabel = "Hapus",
  mode = "edit",
  initialNameFromSearch,
  imageAspectRatio = "default",
}) => {
  const { contextValue, resetInternalState } = useDetailModalLogic({
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
  });

  return (
    <DetailModalProvider value={contextValue}>
      <DetailModalTemplate
        isOpen={isOpen}
        onClose={onClose}
        resetInternalState={resetInternalState}
      >
        <DetailModalContent />
      </DetailModalTemplate>
    </DetailModalProvider>
  );
};

export default IdentityDataModal;