import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { FieldConfig } from '@/types';

interface UseIdentityFormProps {
  initialData: Record<string, string | number | boolean | null>;
  fields: FieldConfig[];
  onSave: (
    updatedData: Record<string, string | number | boolean | null>
  ) => Promise<unknown>;
  onFieldSave?: (key: string, value: unknown) => Promise<void>;
  onImageSave?: (data: {
    entityId?: string;
    file: File;
  }) => Promise<string | void>;
  onImageDelete?: (entityId?: string) => Promise<void>;
  initialImageUrl?: string;
  mode?: 'edit' | 'add';
  isOpen?: boolean;
  initialNameFromSearch?: string;
  useInlineFieldActions?: boolean;
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
  useInlineFieldActions = false,
}: UseIdentityFormProps) => {
  const isMountedRef = useRef(true);
  const [editMode, setEditMode] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<
    Record<string, string | number | boolean | null>
  >({});
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(
    initialImageUrl || null
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [loadingField, setLoadingField] = useState<Record<string, boolean>>({});
  const [localData, setLocalData] =
    useState<Record<string, string | number | boolean | null>>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImageDelete, setPendingImageDelete] = useState(false);
  const inputRefs = useRef<
    Record<string, { el: HTMLInputElement | HTMLTextAreaElement | null }>
  >({});
  const previewImageUrlRef = useRef<string | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formSessionRef = useRef(0);
  const saveAllAttemptRef = useRef(0);
  const fieldSaveAttemptsRef = useRef<Record<string, number>>({});
  const saveAllInFlightRef = useRef(false);
  const fieldSavesInFlightRef = useRef(new Set<string>());

  const clearFocusTimer = useCallback(() => {
    if (!focusTimerRef.current) return;
    clearTimeout(focusTimerRef.current);
    focusTimerRef.current = null;
  }, []);

  const revokePreviewImageUrl = useCallback(() => {
    if (!previewImageUrlRef.current) return;
    URL.revokeObjectURL(previewImageUrlRef.current);
    previewImageUrlRef.current = null;
  }, []);

  const scheduleFieldFocus = useCallback(
    (key: string, delay: number) => {
      clearFocusTimer();
      focusTimerRef.current = setTimeout(() => {
        focusTimerRef.current = null;
        const refData = inputRefs.current[key];
        if (refData && refData.el) {
          refData.el.focus();
          if (typeof refData.el.select === 'function') {
            refData.el.select();
          }
        }
      }, delay);
    },
    [clearFocusTimer]
  );

  const resetInternalState = useCallback(() => {
    clearFocusTimer();
    setEditMode({});
    setEditValues({});
    revokePreviewImageUrl();
    setCurrentImageUrl(null);
    setIsUploadingImage(false);
    setLoadingField({});
    setIsSubmitting(false);
    setPendingImageFile(null);
    setPendingImageDelete(false);
    inputRefs.current = {};
    if (mode === 'add') {
      setLocalData(initialData);
    }
  }, [clearFocusTimer, initialData, mode, revokePreviewImageUrl]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      formSessionRef.current += 1;
      clearFocusTimer();
      revokePreviewImageUrl();
    };
  }, [clearFocusTimer, revokePreviewImageUrl]);

  useEffect(() => {
    formSessionRef.current += 1;
    saveAllAttemptRef.current += 1;
    fieldSaveAttemptsRef.current = {};
    saveAllInFlightRef.current = false;
    fieldSavesInFlightRef.current.clear();
    setLoadingField({});
    setIsSubmitting(false);
  }, [initialData?.id, isOpen, mode]);

  useEffect(() => {
    clearFocusTimer();

    if (!isOpen) {
      return;
    }

    revokePreviewImageUrl();
    const initialEditState: Record<string, boolean> = {};
    const initialFormValues: Record<string, string | number | boolean | null> =
      {};

    fields.forEach(field => {
      initialEditState[field.key] =
        field.editable !== false &&
        (mode === 'add' || (mode === 'edit' && !useInlineFieldActions));
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
    setCurrentImageUrl(initialImageUrl || null);
    setPendingImageFile(null);
    setPendingImageDelete(false);

    if (mode === 'add' && initialNameFromSearch) {
      const nameFieldKey =
        fields.find(f => f.key === 'name')?.key ||
        fields.find(f => f.editable)?.key;
      if (nameFieldKey) {
        scheduleFieldFocus(nameFieldKey, 100);
      }
    }

    return clearFocusTimer;
  }, [
    clearFocusTimer,
    isOpen,
    initialData,
    fields,
    initialImageUrl,
    mode,
    initialNameFromSearch,
    useInlineFieldActions,
    revokePreviewImageUrl,
    scheduleFieldFocus,
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
          scheduleFieldFocus(key, 50);
        } else {
          clearFocusTimer();
        }
        return { ...prevEditModeMap, [key]: newEditState };
      });
    },
    [clearFocusTimer, scheduleFieldFocus]
  );

  const handleChange = useCallback(
    (key: string, value: string | number | boolean | null) => {
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

      if (fieldSavesInFlightRef.current.has(key)) {
        return;
      }

      const fieldSession = formSessionRef.current;
      const fieldAttempt = (fieldSaveAttemptsRef.current[key] ?? 0) + 1;
      fieldSaveAttemptsRef.current[key] = fieldAttempt;
      fieldSavesInFlightRef.current.add(key);
      const valueToSave = editValues[key];
      setLoadingField(prev => ({ ...prev, [key]: true }));
      try {
        await onFieldSave(key, valueToSave);
        if (
          isMountedRef.current &&
          formSessionRef.current === fieldSession &&
          fieldSaveAttemptsRef.current[key] === fieldAttempt
        ) {
          setLocalData(prev => ({ ...prev, [key]: valueToSave }));
          setEditMode(prev => ({ ...prev, [key]: false }));
        }
      } catch (error) {
        if (
          isMountedRef.current &&
          formSessionRef.current === fieldSession &&
          fieldSaveAttemptsRef.current[key] === fieldAttempt
        ) {
          console.error(`Error menyimpan field ${key}:`, error);
        }
      } finally {
        if (
          isMountedRef.current &&
          formSessionRef.current === fieldSession &&
          fieldSaveAttemptsRef.current[key] === fieldAttempt
        ) {
          fieldSavesInFlightRef.current.delete(key);
          setLoadingField(prev => ({ ...prev, [key]: false }));
        }
      }
    },
    [onFieldSave, editValues]
  );

  const handleSaveAll = useCallback(async () => {
    if (saveAllInFlightRef.current) {
      return;
    }

    saveAllInFlightRef.current = true;
    const saveSession = formSessionRef.current;
    const saveAttempt = saveAllAttemptRef.current + 1;
    saveAllAttemptRef.current = saveAttempt;
    const isCurrentSave = () =>
      isMountedRef.current &&
      formSessionRef.current === saveSession &&
      saveAllAttemptRef.current === saveAttempt;
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

      const saveResult = await onSave(dataToSave);
      if (!isCurrentSave()) {
        return;
      }

      const savedEntityId =
        mode === 'edit'
          ? String(initialData?.id || '')
          : typeof saveResult === 'object' &&
              saveResult !== null &&
              'id' in saveResult &&
              typeof saveResult.id === 'string'
            ? saveResult.id
            : '';

      let nextImageUrl = currentImageUrl || null;

      if (savedEntityId && pendingImageDelete && onImageDeleteProp) {
        await onImageDeleteProp(savedEntityId);
        if (!isCurrentSave()) {
          return;
        }
        nextImageUrl = null;
      }

      if (savedEntityId && pendingImageFile && onImageSaveProp) {
        const uploadedUrl = await onImageSaveProp({
          entityId: savedEntityId,
          file: pendingImageFile,
        });
        if (!isCurrentSave()) {
          return;
        }
        if (typeof uploadedUrl === 'string' && uploadedUrl.trim() !== '') {
          nextImageUrl = uploadedUrl;
        }
      }

      if (isCurrentSave()) {
        revokePreviewImageUrl();
        setPendingImageFile(null);
        setPendingImageDelete(false);
        setCurrentImageUrl(nextImageUrl || null);
        setLocalData(prev => ({
          ...prev,
          ...dataToSave,
          image_url: nextImageUrl,
        }));
      }
    } catch (error) {
      if (isCurrentSave()) {
        console.error('Error menyimpan semua data:', error);
      }
    } finally {
      if (isCurrentSave()) {
        saveAllInFlightRef.current = false;
        setIsSubmitting(false);
      }
    }
  }, [
    currentImageUrl,
    editValues,
    initialData?.id,
    mode,
    onImageDeleteProp,
    onImageSaveProp,
    onSave,
    pendingImageDelete,
    pendingImageFile,
    revokePreviewImageUrl,
  ]);

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
        revokePreviewImageUrl();
        const previewUrl = URL.createObjectURL(file);
        previewImageUrlRef.current = previewUrl;
        setCurrentImageUrl(previewUrl);
        setPendingImageFile(file);
        setPendingImageDelete(false);
      } catch (error) {
        console.error('Error pada handleImageUpload:', error);
      } finally {
        setIsUploadingImage(false);
      }
    },
    [revokePreviewImageUrl]
  );

  const handleImageDeleteInternal = useCallback(async () => {
    setIsUploadingImage(true);
    try {
      revokePreviewImageUrl();
      setPendingImageFile(null);
      setCurrentImageUrl(null);
      setPendingImageDelete(mode === 'edit' && Boolean(initialData?.id));
    } catch (error) {
      console.error('Error pada handleImageDeleteInternal:', error);
    } finally {
      setIsUploadingImage(false);
    }
  }, [initialData?.id, mode, revokePreviewImageUrl]);

  const isDirty = useMemo(() => {
    if (mode !== 'edit' || useInlineFieldActions) {
      return true;
    }

    const hasFieldChanges = fields.some(field => {
      const key = field.key;
      const currentValue = editValues[key];
      const savedValue = localData[key];

      const normalizeValue = (value: unknown) => {
        if (value === null || value === undefined) return '';
        if (
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean' ||
          typeof value === 'bigint'
        ) {
          return String(value);
        }
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (typeof value === 'object') {
          try {
            return JSON.stringify(value);
          } catch {
            return '';
          }
        }
        return '';
      };

      return normalizeValue(currentValue) !== normalizeValue(savedValue);
    });

    return hasFieldChanges || pendingImageDelete || pendingImageFile !== null;
  }, [
    mode,
    useInlineFieldActions,
    fields,
    editValues,
    localData,
    pendingImageDelete,
    pendingImageFile,
  ]);

  return {
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
  };
};
