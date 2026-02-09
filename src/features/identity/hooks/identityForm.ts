import { useState, useEffect, useCallback, useRef } from 'react';
import type { FieldConfig } from '@/types';

interface UseIdentityFormProps {
  initialData: Record<string, string | number | boolean | null>;
  fields: FieldConfig[];
  onSave: (
    updatedData: Record<string, string | number | boolean | null>
  ) => Promise<void>;
  onFieldSave?: (key: string, value: unknown) => Promise<void>;
  onImageSave?: (data: { entityId?: string; file: File }) => Promise<void>;
  onImageDelete?: (supplierId?: string) => Promise<void>;
  initialImageUrl?: string;
  mode?: 'edit' | 'add';
  isOpen?: boolean;
  initialNameFromSearch?: string;
}

export const useIdentityForm = ({
  initialData,
  fields,
  onSave,
  onFieldSave,
  onImageSave: onImageSaveProp,
  onImageDelete: onImageDeleteProp,
  initialImageUrl,
  mode = 'edit',
  isOpen,
  initialNameFromSearch,
}: UseIdentityFormProps) => {
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<
    Record<string, string | number | boolean | null>
  >({});
  const [currentImageUrl, setCurrentImageUrl] = useState(initialImageUrl);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [loadingField, setLoadingField] = useState<Record<string, boolean>>({});
  const [localData, setLocalData] = useState<
    Record<string, string | number | boolean | null>
  >(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef<
    Record<string, { el: HTMLInputElement | HTMLTextAreaElement | null }>
  >({});

  const resetInternalState = useCallback(() => {
    setEditMode({});
    setEditValues({});
    setCurrentImageUrl(undefined);
    setIsUploadingImage(false);
    setLoadingField({});
    setIsSubmitting(false);
    inputRefs.current = {};
    if (mode === 'add') {
      setLocalData(initialData);
    }
  }, [mode, initialData]);

  useEffect(() => {
    if (isOpen) {
      const initialEditState: Record<string, boolean> = {};
      const initialFormValues: Record<
        string,
        string | number | boolean | null
      > = {};

      fields.forEach(field => {
        initialEditState[field.key] = mode === 'add';
        let value =
          initialData[field.key] ??
          (field.type === 'textarea' ||
          field.type === 'text' ||
          field.type === 'email' ||
          field.type === 'tel'
            ? ''
            : null);

        if (mode === 'add' && field.key === 'name' && initialNameFromSearch) {
          value = initialNameFromSearch;
        }
        initialFormValues[field.key] = value;
      });
      setEditMode(initialEditState);
      setEditValues(initialFormValues);
      setLocalData(initialData);
      setCurrentImageUrl(initialImageUrl);

      if (mode === 'add' && initialNameFromSearch) {
        const nameFieldKey =
          fields.find(f => f.key === 'name')?.key ||
          fields.find(f => f.editable)?.key;
        if (nameFieldKey) {
          setTimeout(() => {
            const refData = inputRefs.current[nameFieldKey];
            if (refData && refData.el) {
              refData.el.focus();
              if (
                typeof (refData.el as HTMLInputElement | HTMLTextAreaElement)
                  .select === 'function'
              ) {
                (refData.el as HTMLInputElement | HTMLTextAreaElement).select();
              }
            }
          }, 100);
        }
      }
    }
  }, [
    isOpen,
    initialData,
    fields,
    initialImageUrl,
    mode,
    initialNameFromSearch,
  ]);

  const setInputRef = useCallback(
    (key: string, el: HTMLInputElement | HTMLTextAreaElement | null) => {
      if (el) {
        inputRefs.current[key] = { el };
      } else {
        delete inputRefs.current[key];
      }
    },
    []
  );

  const toggleEdit = useCallback(
    (key: string) => {
      setEditMode(prevEditModeMap => {
        const isCurrentlyEditing = prevEditModeMap[key];
        const newEditState = !isCurrentlyEditing;

        if (newEditState) {
          setTimeout(() => {
            const refData = inputRefs.current[key];
            if (refData && refData.el) {
              refData.el.focus();
              if (
                typeof (refData.el as HTMLInputElement | HTMLTextAreaElement)
                  .select === 'function'
              ) {
                (refData.el as HTMLInputElement | HTMLTextAreaElement).select();
              }
            }
          }, 50);
        }
        return { ...prevEditModeMap, [key]: newEditState };
      });
    },
    [inputRefs]
  );

  const handleChange = useCallback(
    (key: string, value: string | number | boolean) => {
      setEditValues(prev => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const handleSaveField = useCallback(
    async (key: string) => {
      if (!onFieldSave) {
        console.warn(
          'Handler onFieldSave tidak disediakan pada hook useIdentityForm.'
        );
        setLocalData(prev => ({ ...prev, [key]: editValues[key] }));
        setEditMode(prev => ({ ...prev, [key]: false }));
        return;
      }

      setLoadingField(prev => ({ ...prev, [key]: true }));
      try {
        await onFieldSave(key, editValues[key]);
        setLocalData(prev => ({ ...prev, [key]: editValues[key] }));
        setEditMode(prev => ({ ...prev, [key]: false }));
      } catch (error) {
        console.error(`Error menyimpan field ${key}:`, error);
      } finally {
        setLoadingField(prev => ({ ...prev, [key]: false }));
      }
    },
    [onFieldSave, editValues]
  );

  const handleSaveAll = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const dataToSave = { ...editValues };
      if (mode === 'add' && currentImageUrl) {
        if (
          typeof currentImageUrl === 'string' &&
          currentImageUrl.startsWith('data:image')
        ) {
          dataToSave.image_url = currentImageUrl;
        }
      }
      await onSave(dataToSave);
    } catch (error) {
      console.error('Error menyimpan semua data:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [onSave, editValues, mode, currentImageUrl]);

  const handleCancelEdit = useCallback(
    (key: string) => {
      setEditValues(prev => ({
        ...prev,
        [key]: localData[key],
      }));
      setEditMode(prev => ({ ...prev, [key]: false }));
    },
    [localData]
  );

  const handleImageUpload = useCallback(
    async (file: File) => {
      setIsUploadingImage(true);
      try {
        if (mode === 'add') {
          const tempUrl = URL.createObjectURL(file);
          setCurrentImageUrl(tempUrl);
        } else if (onImageSaveProp && initialData?.id) {
          await onImageSaveProp({ entityId: String(initialData.id), file });
        }
      } catch (error) {
        console.error('Error pada handleImageUpload:', error);
      } finally {
        setIsUploadingImage(false);
      }
    },
    [onImageSaveProp, mode, initialData]
  );

  const handleImageDeleteInternal = useCallback(async () => {
    setIsUploadingImage(true);
    try {
      if (mode === 'add') {
        setCurrentImageUrl(undefined);
      } else if (onImageDeleteProp && initialData?.id) {
        await onImageDeleteProp(String(initialData.id));
        setCurrentImageUrl(undefined);
        setLocalData(prev => ({ ...prev, image_url: null }));
      }
    } catch (error) {
      console.error('Error pada handleImageDeleteInternal:', error);
    } finally {
      setIsUploadingImage(false);
    }
  }, [onImageDeleteProp, mode, initialData]);

  return {
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
  };
};
