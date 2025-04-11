// src/components/master-data/DetailEditModal.tsx
import React, { useState } from 'react';
import { FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import { Button } from '../ui/Button';

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
    imageUrl,
    imagePlaceholder
}) => {
    const [editMode, setEditMode] = useState<Record<string, boolean>>({});
    const [editValues, setEditValues] = useState<Record<string, string | number | boolean | null>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    // Inisialisasi nilai editan dengan data saat ini
    React.useEffect(() => {
        if (isOpen && data) {
            const initialValues: Record<string, string | number | boolean | null> = {}; 
            fields.forEach(field => {
                initialValues[field.key] = data[field.key]; // Assign directly, handle null/undefined later if needed
            });
            setEditValues(initialValues);
        }
    }, [isOpen, data, fields]);

    if (!isOpen) return null;

    const toggleEdit = (key: string) => {
        setEditMode(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleChange = (key: string, value: string) => { // Assume value from input/textarea is string
        setEditValues(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSaveField = async (key: string) => {
        try {
            setLoading(prev => ({ ...prev, [key]: true }));

            // Buat object dengan hanya field yang diubah
            const updatedData = { [key]: editValues[key] };
            await onSave(updatedData);

            // Toggle off edit mode setelah berhasil
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
            [key]: data[key] // Reset to original value (could be null)
        }));
        toggleEdit(key);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <Button
                        variant="text"
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        <FaTimes size={20} />
                    </Button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    {/* Gambar Header (jika ada) */}
                    {(imageUrl || imagePlaceholder) && (
                        <div className="flex justify-center mb-6">
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200">
                                <img
                                    src={imageUrl || imagePlaceholder}
                                    alt={String(data.name ?? 'Detail')}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    )}

                    {/* Fields */}
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
                                            value={String(editValues[field.key] ?? '')} // Ensure value is string
                                            onChange={(e) => handleChange(field.key, e.target.value)}
                                            className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                            rows={3}
                                        />
                                    ) : (
                                        <input
                                            type={field.type || 'text'}
                                            value={String(editValues[field.key] ?? '')} // Ensure value is string
                                            onChange={(e) => handleChange(field.key, e.target.value)}
                                            className="w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    )
                                ) : (
                                    <div className="p-2 bg-gray-50 rounded-md min-h-[40px]">
                                        {String(data[field.key] ?? '') || ( // Display original data, convert to string
                                            <span className="text-gray-400 italic">Tidak ada data</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Tutup
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DetailEditModal;