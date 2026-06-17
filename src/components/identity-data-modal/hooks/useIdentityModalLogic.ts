import { useEffect, useState, useCallback, useRef } from 'react';
import { useIdentityForm } from './identityForm';
import { focusEditableIdentityField, focusIdentitySearchInput } from '../focus';
import { formatDateTime } from '@/lib/formatters';
import type { GenericIdentityModalProps } from '@/types';
import type { IdentityModalContextValue } from '@/contexts/IdentityModalContextState';

interface UseIdentityModalLogicProps {
  title: string;
  data: Record<string, string | number | boolean | null>;
  fields: GenericIdentityModalProps['fields'];
  isOpen: boolean;
  onClose: () => void;
  onSave?: GenericIdentityModalProps['onSave'];
  onFieldSave?: GenericIdentityModalProps['onFieldSave'];
  onImageSave?: GenericIdentityModalProps['onImageSave'];
  onImageDelete?: GenericIdentityModalProps['onImageDelete'];
  imageUrl?: string;
  defaultImageUrl?: string;
  imagePlaceholder?: string;
  imageUploadText?: string;
  imageNotAvailableText?: string;
  imageFormatHint?: string;
  onDeleteRequest?: GenericIdentityModalProps['onDeleteRequest'];
  deleteButtonLabel?: string;
  mode?: 'edit' | 'add';
  initialNameFromSearch?: string;
  imageAspectRatio?: 'default' | 'square';
  showImageUploader?: boolean;
  useInlineFieldActions?: boolean;
}

export const useIdentityModalLogic = (props: UseIdentityModalLogicProps) => {
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
    imageUploadText = 'Unggah gambar',
    imageNotAvailableText = 'Gambar belum tersedia',
    imageFormatHint = 'Format: JPG, PNG',
    onDeleteRequest,
    deleteButtonLabel = 'Hapus',
    mode = 'edit',
    initialNameFromSearch,
    imageAspectRatio = 'default',
    showImageUploader = true,
    useInlineFieldActions = false,
  } = props;
  const nameFocusTimerRef = useRef<number | null>(null);
  const searchFocusFrameRef = useRef<number | null>(null);

  const clearNameFocusTimer = useCallback(() => {
    if (nameFocusTimerRef.current === null) {
      return;
    }

    window.clearTimeout(nameFocusTimerRef.current);
    nameFocusTimerRef.current = null;
  }, []);

  const clearSearchFocusFrame = useCallback(() => {
    if (searchFocusFrameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(searchFocusFrameRef.current);
    searchFocusFrameRef.current = null;
  }, []);

  // Use getDerivedStateFromProps to reset isClosing when isOpen changes
  const [closingState, setClosingState] = useState({
    isOpen: false,
    isClosing: false,
  });
  if (isOpen !== closingState.isOpen) {
    setClosingState({ isOpen, isClosing: false });
  }
  const setIsClosing = useCallback((value: boolean) => {
    setClosingState(prev => ({ ...prev, isClosing: value }));
  }, []);

  const {
    editMode,
    editValues,
    currentImageUrl,
    pendingImageDelete,
    isUploadingImage,
    loadingField,
    isSubmitting,
    isDirty,
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
  } = useIdentityForm({
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
    useInlineFieldActions,
  });

  // Auto-focus on name field when modal opens
  useEffect(() => {
    clearNameFocusTimer();

    if (!isOpen || closingState.isClosing) {
      return;
    }

    const nameField = fields.find(
      field =>
        field.key === 'name' ||
        field.key === 'nama' ||
        field.label.toLowerCase().includes('nama')
    );

    if (nameField && (mode === 'add' || editMode[nameField.key])) {
      const fieldKey = nameField.key;
      nameFocusTimerRef.current = window.setTimeout(() => {
        nameFocusTimerRef.current = null;
        focusEditableIdentityField(fieldKey);
      }, 100);
    }

    return clearNameFocusTimer;
  }, [
    clearNameFocusTimer,
    closingState.isClosing,
    editMode,
    fields,
    isOpen,
    mode,
  ]);

  useEffect(() => {
    if (isOpen) {
      clearSearchFocusFrame();
    }
  }, [clearSearchFocusFrame, isOpen]);

  useEffect(() => clearSearchFocusFrame, [clearSearchFocusFrame]);

  const handleCloseModal = useCallback(() => {
    clearNameFocusTimer();
    clearSearchFocusFrame();
    setIsClosing(true);

    const frameId = window.requestAnimationFrame(() => {
      if (searchFocusFrameRef.current !== frameId) {
        return;
      }

      searchFocusFrameRef.current = null;
      focusIdentitySearchInput();
    });
    searchFocusFrameRef.current = frameId;

    onClose();
  }, [clearNameFocusTimer, clearSearchFocusFrame, onClose, setIsClosing]);

  // isClosing auto-resets when isOpen changes (getDerivedStateFromProps pattern)

  const formattedUpdateAt = formatDateTime(
    typeof data?.updated_at === 'string' ? data.updated_at : null
  );

  const contextValue: IdentityModalContextValue = {
    // State
    editMode,
    editValues,
    currentImageUrl: currentImageUrl || null,
    pendingImageDelete,
    isUploadingImage,
    loadingField,
    isSubmitting,
    isDirty,
    localData,

    // UI State
    title,
    mode,
    formattedUpdateAt,
    imageAspectRatio,
    showImageUploader,
    useInlineFieldActions,

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
