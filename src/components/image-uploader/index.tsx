import React, { useState, useRef } from 'react';
import type { ImageUploaderProps } from '@/types';
import { FaSpinner, FaPencilAlt, FaTrash, FaUpload } from 'react-icons/fa';

const ImageUploader: React.FC<ImageUploaderProps> = ({
  id,
  onImageUpload,
  onImageDelete,
  children,
  validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  className = '',
  disabled = false,
  loadingIcon = <FaSpinner className="text-white text-xl animate-spin" />,
  shape = 'full',
}) => {
  const [isHovering, setIsHovering] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasImage = React.isValidElement(children) && children.type === 'img';

  const getBorderRadiusClass = () => {
    switch (shape) {
      case 'rounded-sm':
        return 'rounded-md';
      case 'square':
        return 'rounded-none';
      case 'full':
        return 'rounded-full';
      default:
        return 'rounded-full';
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!validTypes.includes(file.type)) {
      alert(
        `Tipe file tidak valid. Harap unggah file ${validTypes.join(', ')}.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await onImageUpload(file);
    } catch (uploadError) {
      console.error('Error during image upload callback:', uploadError);
      setError('Gagal memproses gambar.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async (
    e: React.MouseEvent<SVGElement, MouseEvent>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (!onImageDelete || isDeleting || disabled) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onImageDelete();
    } catch (deleteError) {
      console.error('Error during image deletion:', deleteError);
      setError('Gagal menghapus gambar.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`relative group ${className} ${getBorderRadiusClass()} overflow-hidden`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {children}
      <label
        htmlFor={id}
        className={`absolute inset-0 flex items-center justify-center bg-black/50 ${getBorderRadiusClass()} ${isHovering || isUploading || isDeleting ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300 cursor-pointer`}
      >
        {isUploading || isDeleting ? (
          loadingIcon
        ) : hasImage ? (
          <FaPencilAlt className="text-white text-lg" title="Edit" />
        ) : (
          <FaUpload className="text-white text-xl" title="Unggah" />
        )}
      </label>
      {hasImage && onImageDelete && !isUploading && !isDeleting && (
        <button
          onClick={e =>
            handleDeleteImage(
              e as unknown as React.MouseEvent<SVGElement, MouseEvent>
            )
          }
          className={`absolute top-1 right-1 p-1 rounded-full text-white hover:text-red-500 hover:bg-black/70 transition-all duration-200 ${isHovering ? 'opacity-100 scale-100' : 'opacity-0 scale-90'} z-10`}
          aria-label="Hapus gambar"
          title="Hapus"
          disabled={disabled || isDeleting}
        >
          {isDeleting ? (
            <FaSpinner className="animate-spin text-sm" />
          ) : (
            <FaTrash className="text-sm" />
          )}
        </button>
      )}
      <input
        id={id}
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={validTypes.join(',')}
        onChange={handleFileChange}
        disabled={isUploading || isDeleting || disabled}
      />
      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
    </div>
  );
};

export default ImageUploader;
