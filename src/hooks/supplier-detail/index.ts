// src/hooks/useSupplierDetailForm.ts
import { useState, useEffect, useCallback } from 'react';
import type { FieldConfig } from '@/types';

interface UseSupplierDetailFormProps {
    initialData: Record<string, string | number | boolean | null>;
    fields: FieldConfig[];
    onSave: (updatedData: Record<string, string | number | boolean | null>) => Promise<void>;
    onFieldSave?: (key: string, value: unknown) => Promise<void>;
    onImageSave?: (data: { supplierId?: string; imageBase64: string }) => Promise<void>;
    onImageDelete?: (supplierId?: string) => Promise<void>;
    initialImageUrl?: string;
    mode?: 'edit' | 'add';
    isOpen?: boolean;
}

export const useSupplierDetailForm = ({
    initialData,
    fields,
    onSave,
    onFieldSave,
    onImageSave: onImageSaveProp,
    onImageDelete: onImageDeleteProp,
    initialImageUrl,
    mode = 'edit',
    isOpen
}: UseSupplierDetailFormProps) => {
    const [editMode, setEditMode] = useState<Record<string, boolean>>({});
    const [editValues, setEditValues] = useState<Record<string, string | number | boolean | null>>({});
    const [currentImageUrl, setCurrentImageUrl] = useState(initialImageUrl);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [loadingField, setLoadingField] = useState<Record<string, boolean>>({});
    const [localData, setLocalData] = useState<Record<string, string | number | boolean | null>>(initialData);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetInternalState = useCallback(() => {
        setEditMode({});
        setEditValues({});
        setCurrentImageUrl(undefined);
        setIsUploadingImage(false);
        setLoadingField({});
        setIsSubmitting(false);
        if (mode === 'add') {
            setLocalData(initialData); 
        }
    }, [mode, initialData]);

    useEffect(() => {
        if (isOpen) {
            const initialEditState: Record<string, boolean> = {};
            const initialFormValues: Record<string, string | number | boolean | null> = {};

            fields.forEach(field => {
                initialEditState[field.key] = mode === 'add';
                initialFormValues[field.key] = initialData[field.key] ?? (field.type === 'textarea' || field.type === 'text' || field.type === 'email' || field.type === 'tel' ? '' : null);
            });
            setEditMode(initialEditState);
            setEditValues(initialFormValues);
            setLocalData(initialData);
            setCurrentImageUrl(initialImageUrl);
        }
    }, [isOpen, initialData, fields, initialImageUrl, mode]);

    const toggleEdit = useCallback((key: string) => {
        setEditMode(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    }, []);

    const handleChange = useCallback((key: string, value: string | number | boolean) => {
        setEditValues(prev => ({
            ...prev,
            [key]: value
        }));
    }, []);

    const handleSaveField = useCallback(async (key: string) => {
        if (!onFieldSave) {
            console.warn("Handler onFieldSave tidak disediakan pada hook useSupplierDetailForm.");
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
    }, [onFieldSave, editValues]);

    const handleSaveAll = useCallback(async () => {
        setIsSubmitting(true);
        try {
            const dataToSave = { ...editValues };
            if (mode === 'add' && currentImageUrl) {
                if (typeof currentImageUrl === 'string' && currentImageUrl.startsWith('data:image')) {
                    dataToSave.image_url = currentImageUrl;
                }
            }
            await onSave(dataToSave);
        } catch (error) {
            console.error("Error menyimpan semua data:", error);
        } finally {
            setIsSubmitting(false);
        }
    }, [onSave, editValues, mode, currentImageUrl]);

    const handleCancelEdit = useCallback((key: string) => {
        setEditValues(prev => ({
            ...prev,
            [key]: localData[key]
        }));
        setEditMode(prev => ({ ...prev, [key]: false }));
    }, [localData]);

    const handleImageUpload = useCallback(async (imageBase64: string) => {
        setIsUploadingImage(true);
        try {
            if (mode === 'add') {
                setCurrentImageUrl(imageBase64);
            } else if (onImageSaveProp && initialData?.id) {
                await onImageSaveProp({ supplierId: String(initialData.id), imageBase64 });
                setCurrentImageUrl(imageBase64);
                setLocalData(prev => ({ ...prev, image_url: imageBase64 }));
            }
        } catch (error) {
            console.error("Error pada handleImageUpload:", error);
        } finally {
            setIsUploadingImage(false);
        }
    }, [onImageSaveProp, mode, initialData, setCurrentImageUrl, setLocalData, setIsUploadingImage]);

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
            console.error("Error pada handleImageDeleteInternal:", error);
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
    };
};