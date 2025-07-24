import { useEffect, useState, useCallback } from "react";
import { useDetailForm } from "@/hooks/detailForm";
import { formatDateTime } from "@/lib/formatters";
import type { GenericDetailModalProps } from "@/types";
import type { DetailModalContextValue } from "@/contexts/DetailModalContext";

interface UseDetailModalLogicProps {
  title: string;
  data: Record<string, string | number | boolean | null>;
  fields: GenericDetailModalProps["fields"];
  isOpen: boolean;
  onClose: () => void;
  onSave?: GenericDetailModalProps["onSave"];
  onFieldSave?: GenericDetailModalProps["onFieldSave"];
  onImageSave?: GenericDetailModalProps["onImageSave"];
  onImageDelete?: GenericDetailModalProps["onImageDelete"];
  imageUrl?: string;
  defaultImageUrl?: string;
  imagePlaceholder?: string;
  imageUploadText?: string;
  imageNotAvailableText?: string;
  imageFormatHint?: string;
  onDeleteRequest?: GenericDetailModalProps["onDeleteRequest"];
  deleteButtonLabel?: string;
  mode?: "edit" | "add";
  initialNameFromSearch?: string;
  imageAspectRatio?: "default" | "square";
}

export const useDetailModalLogic = (props: UseDetailModalLogicProps) => {
  const {
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
  } = props;

  const [, setIsClosing] = useState(false);

  const {
    editMode,
    editValues,
    currentImageUrl,
    isUploadingImage,
    loadingField,
    isSubmitting,
    localData,
    toggleEdit,
    handleChange,
    handleSaveField,
    handleSaveAll,
    handleCancelEdit,
    handleImageUpload,
    handleImageDeleteInternal,
    resetInternalState,
    setInputRef,
  } = useDetailForm({
    initialData: data,
    fields,
    onSave: onSave || (() => Promise.resolve()),
    onFieldSave,
    onImageSave,
    onImageDelete: onImageDelete
      ? (entityId?: string) => {
          if (entityId) {
            return onImageDelete(entityId);
          }
          return Promise.resolve();
        }
      : undefined,
    initialImageUrl: imageUrl,
    mode,
    isOpen,
    initialNameFromSearch,
  });

  // Auto-focus on name field when modal opens
  useEffect(() => {
    if (isOpen) {
      const nameField = fields.find(
        (field) =>
          field.key === "name" ||
          field.key === "nama" ||
          field.label.toLowerCase().includes("nama"),
      );

      if (nameField && (mode === "add" || editMode[nameField.key])) {
        setTimeout(() => {
          const inputElement = document.getElementById(nameField.key) as
            | HTMLInputElement
            | HTMLTextAreaElement;
          if (inputElement) {
            inputElement.focus();
          }
        }, 100);
      }
    }
  }, [isOpen, mode, editMode, fields]);

  const handleCloseModal = useCallback(() => {
    setIsClosing(true);

    requestAnimationFrame(() => {
      const searchInput = document.querySelector(
        'input[placeholder*="Cari"]',
      ) as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    });

    onClose();
  }, [onClose]);

  // Reset closing state when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  const formattedUpdateAt = formatDateTime(
    typeof data?.updated_at === "string" ? data.updated_at : null,
  );

  const contextValue: DetailModalContextValue = {
    // State
    editMode,
    editValues,
    currentImageUrl: currentImageUrl || null,
    isUploadingImage,
    loadingField,
    isSubmitting,
    localData: localData as Record<string, string | number | boolean | null>,
    
    // UI State
    title,
    mode,
    formattedUpdateAt,
    imageAspectRatio,
    
    // Image Config
    imageUploadText,
    imageNotAvailableText,
    imageFormatHint,
    defaultImageUrl,
    imagePlaceholder,
    
    // Field Config
    fields,
    
    // Actions
    toggleEdit,
    handleChange,
    handleSaveField,
    handleCancelEdit,
    handleSaveAll,
    handleImageUpload,
    handleImageDeleteInternal,
    handleCloseModal,
    
    // Delete Action
    onDeleteRequest,
    deleteButtonLabel,
    
    // Refs
    setInputRef,
  };

  // Return context value and reset function for cleanup
  return {
    contextValue,
    resetInternalState,
  };
};