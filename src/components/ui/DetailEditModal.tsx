import React, { useState, useEffect, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { FaEdit, FaCheck, FaTimes, FaPencilAlt, FaSpinner } from 'react-icons/fa';
import { Button } from './Button';
import { ImageUploader } from './ImageUploader';
import { Transition, TransitionChild } from '@headlessui/react';

interface FieldConfig {
    key: string;
    label: string;
    type?: 'text' | 'email' | 'tel' | 'textarea';
    editable?: boolean;
}

interface DetailEditModalProps {
    title: string;
    data: Record<string, string | number | boolean | null>;
    fields: FieldConfig[];
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedData: Record<string, string | number | boolean | null>) => Promise<void>;
    onImageSave?: (data: { supplierId: string; imageBase64: string }) => Promise<void>;
    onDeleteRequest?: (data: Record<string, string | number | boolean | null>) => void;
    deleteButtonLabel?: string;
    imageUrl?: string;
    imagePlaceholder?: string;
}

const DetailEditModal: React.FC<DetailEditModalProps> = ({
    title,
    data,
    fields,
    isOpen,
    onClose,
    onSave,
    onImageSave,
    imageUrl,
    imagePlaceholder,
    onDeleteRequest,
    deleteButtonLabel = 'Hapus'
}) => {
    const [editMode, setEditMode] = useState<Record<string, boolean>>({});
    const [editValues, setEditValues] = useState<Record<string, string | number | boolean | null>>({});
    const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [localData, setLocalData] = useState<Record<string, string | number | boolean | null>>(data);

    useEffect(() => {
        if (isOpen && data) {
            const initialValues: Record<string, string | number | boolean | null> = {};
            fields.forEach(field => {
                initialValues[field.key] = data[field.key];
            });
            setEditValues(initialValues);
            setLocalData(data);
            setCurrentImageUrl(imageUrl);
        }
    }, [isOpen, data, fields, imageUrl]);

    const toggleEdit = (key: string) => {
        setEditMode(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleChange = (key: string, value: string) => {
        setEditValues(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSaveField = async (key: string) => {
        try {
            setLoading(prev => ({ ...prev, [key]: true }));

            const updatedData = { [key]: editValues[key] };
            await onSave(updatedData);

            setLocalData(prev => ({
                ...prev,
                [key]: editValues[key]
            }));

            toggleEdit(key);
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
        } finally {
            setLoading(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleCancel = (key: string) => {
        setEditValues(prev => ({
            ...prev,
            [key]: localData[key]
        }));
        toggleEdit(key);
    };

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return createPortal(
        <Transition show={isOpen} as={Fragment}>
            <div
                className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
                onClick={handleBackdropClick}
            >
                <TransitionChild
                    as={Fragment}
                    enter="transition-opacity duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="transition-opacity duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                        aria-hidden="true"
                    />
                </TransitionChild>

                <TransitionChild
                    as={Fragment}
                    enter="transition-all duration-200 ease-out"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="transition-all duration-200 ease-in"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                >
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden relative mx-4">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h2 className="text-xl font-semibold">{title}</h2>
                            <Button
                                variant="text"
                                onClick={onClose}
                                className="text-gray-500 hover:text-gray-700 p-1"
                            >
                                <FaTimes size={20} />
                            </Button>
                        </div>

                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {(imageUrl || imagePlaceholder) && (
                                <div className="flex justify-center mb-6">
                                    <div className="relative group w-48">
                                        <ImageUploader
                                            id="supplier-image-upload"
                                            className="w-full"
                                            shape="rounded"
                                            onImageUpload={async (base64) => {
                                                if (onImageSave && data?.id) {
                                                    setIsUploadingImage(true);
                                                    try {
                                                        await onImageSave({ supplierId: data.id as string, imageBase64: base64 });
                                                        setCurrentImageUrl(base64);
                                                    } finally {
                                                        setIsUploadingImage(false);
                                                    }
                                                } else {
                                                    console.error("onImageSave prop or supplier ID is missing.");
                                                    alert("Gagal mengunggah gambar: Konfigurasi tidak lengkap.");
                                                }
                                            }}
                                            disabled={isUploadingImage || !onImageSave}
                                            loadingIcon={<FaSpinner className="text-white text-xl animate-spin" />}
                                            defaultIcon={<FaPencilAlt className="text-white text-xl" />}
                                        >
                                            <img
                                                src={currentImageUrl || imagePlaceholder}
                                                alt={String(data.name ?? 'Detail')}
                                                className="w-full h-auto aspect-video object-cover rounded-md border border-gray-200"
                                            />
                                        </ImageUploader>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                {fields.map(field => (
                                    <div key={field.key} className="bg-white rounded-md">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-sm font-medium text-gray-600">{field.label}</label>
                                            {field.editable !== false && (
                                                <div className="flex space-x-2">
                                                    {editMode[field.key] ? (
                                                        <>
                                                            <Button
                                                                variant="text"
                                                                size="sm"
                                                                onClick={() => handleCancel(field.key)}
                                                                className="text-gray-500 hover:text-gray-700 p-1"
                                                            >
                                                                <FaTimes className="text-red-500" />
                                                            </Button>
                                                            <Button
                                                                variant="text"
                                                                size="sm"
                                                                onClick={() => handleSaveField(field.key)}
                                                                className="text-gray-500 hover:text-gray-700 p-1"
                                                                disabled={loading[field.key]}
                                                            >
                                                                {loading[field.key] ? (
                                                                    <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block"></span>
                                                                ) : (
                                                                    <FaCheck className="text-green-500" />
                                                                )}
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            variant="text"
                                                            size="sm"
                                                            onClick={() => toggleEdit(field.key)}
                                                            className="text-gray-500 hover:text-gray-700 p-1"
                                                        >
                                                            <FaEdit />
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {editMode[field.key] ? (
                                            field.type === 'textarea' ? (
                                                <textarea
                                                    value={String(editValues[field.key] ?? '')}
                                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                                    className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                    rows={3}
                                                />
                                            ) : (
                                                <input
                                                    type={field.type || 'text'}
                                                    value={String(editValues[field.key] ?? '')}
                                                    onChange={(e) => handleChange(field.key, e.target.value)}
                                                    className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                                />
                                            )
                                        ) : (
                                            <div className="p-2 bg-gray-50 rounded-md min-h-[40px]">
                                                {String(localData[field.key] ?? '') || (
                                                    <span className="text-gray-400 italic">Tidak ada data</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t flex justify-between items-center">
                            {onDeleteRequest && (
                                <Button variant="danger" onClick={() => onDeleteRequest(data)}>
                                    {deleteButtonLabel}
                                </Button>
                            )}
                            <Button variant="outline" onClick={onClose}>
                                Tutup
                            </Button>
                        </div>
                    </div>
                </TransitionChild>
            </div>
        </Transition>
    , document.body
    );
};

export default DetailEditModal;