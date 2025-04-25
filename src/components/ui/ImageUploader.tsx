import React, { useState, useRef } from 'react';
import { FaSpinner, FaCamera } from 'react-icons/fa';
import { compressImageIfNeeded } from '../../lib/imageUtils';

interface ImageUploaderProps {
    id: string;
    onImageUpload: (imageBase64: string) => Promise<void> | void;
    children: React.ReactNode;
    maxSizeMB?: number;
    validTypes?: string[];
    className?: string;
    disabled?: boolean;
    loadingIcon?: React.ReactNode;
    defaultIcon?: React.ReactNode;
    shape?: 'rounded' | 'square' | 'full';
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
    id,
    onImageUpload,
    children,
    validTypes = ['image/png', 'image/jpeg', 'image/jpg'],
    className = '',
    disabled = false,
    loadingIcon = <FaSpinner className="text-white text-xl animate-spin" />,
    defaultIcon = <FaCamera className="text-white text-xl" />,
    shape = 'full'
}) => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getBorderRadiusClass = () => {
        switch (shape) {
            case 'rounded': return 'rounded-md';
            case 'square': return 'rounded-none';
            case 'full': return 'rounded-full';
            default: return 'rounded-full';
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!validTypes.includes(file.type)) {
            alert(`Tipe file tidak valid. Harap unggah file ${validTypes.join(', ')}.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            const processedFile = await compressImageIfNeeded(file);

            const reader = new FileReader();
            reader.readAsDataURL(processedFile);
            reader.onloadend = async () => {
                if (typeof reader.result === 'string') {
                    try {
                        await onImageUpload(reader.result);
                    } catch (uploadError) {
                        console.error("Error during image upload callback:", uploadError);
                        setError("Gagal memproses gambar.");
                    } finally {
                        setIsUploading(false);
                        if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                        }
                    }
                } else {
                    setError("Gagal membaca file gambar.");
                    setIsUploading(false);
                }
            };
            reader.onerror = () => {
                setError("Gagal membaca file gambar.");
                setIsUploading(false);
            };
        } catch (compressionError: unknown) {
            setError(compressionError instanceof Error ? compressionError.message : "Gagal mengompres gambar.");
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className={`relative group ${className}`}>
            <label htmlFor={id} className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 ${getBorderRadiusClass()} opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer`}>
                {isUploading ? loadingIcon : defaultIcon}
            </label>
            {children}
            <input
                id={id}
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={validTypes.join(',')}
                onChange={handleFileChange}
                disabled={isUploading || disabled}
            />
            {error && (
                <div className="mt-2 text-sm text-red-600">{error}</div>
            )}
        </div>
    );
};
