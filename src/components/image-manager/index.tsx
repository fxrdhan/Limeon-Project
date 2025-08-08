import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ImageUploaderProps } from '@/types';
import { FaSpinner, FaUpload, FaEdit, FaTrash } from 'react-icons/fa';

const ImageUploader: React.FC<ImageUploaderProps> = ({
  id,
  onImageUpload,
  onImageDelete,
  children,
  hasImage = false,
  validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  className = '',
  disabled = false,
  loadingIcon = <FaSpinner className="text-white text-xl animate-spin" />,
  shape = 'full',
}) => {
  const [isHoveringContainer, setIsHoveringContainer] = useState(false);
  const [isHoveringPopup, setIsHoveringPopup] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState<'left' | 'right'>('right');
  const [popupCoordinates, setPopupCoordinates] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Use explicit hasImage prop instead of trying to detect from children

  // Combined hover and focus state
  const isVisible = isHoveringContainer || isHoveringPopup || isFocused;

  // Function to close the portal
  const closePortal = () => {
    setIsHoveringContainer(false);
    setIsHoveringPopup(false);
    setIsFocused(false);
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

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

  const handleDeleteImage = async () => {
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

  const handleUploadClick = () => {
    if (fileInputRef.current && !disabled && !isUploading && !isDeleting) {
      fileInputRef.current.click();
    }
  };

  const handleMouseEnter = (target: 'container' | 'popup') => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    if (target === 'container') {
      setIsHoveringContainer(true);
    } else {
      setIsHoveringPopup(true);
    }
  };

  const handleMouseLeave = (target: 'container' | 'popup') => {
    // Add delay before updating state to allow mouse movement between areas
    hideTimeoutRef.current = setTimeout(() => {
      if (target === 'container') {
        setIsHoveringContainer(false);
      } else {
        setIsHoveringPopup(false);
      }
    }, 100); // 100ms delay for smoother transition
  };

  const calculatePopupPosition = () => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const popupWidth = 80; // Estimated popup width + smaller margin
    const spaceOnRight = viewportWidth - containerRect.right;
    const spaceOnLeft = containerRect.left;

    // Calculate popup coordinates relative to viewport
    const centerY = containerRect.top + containerRect.height / 2;
    let popupX: number;
    let position: 'left' | 'right';

    // Prefer right if there's enough space, otherwise use left if there's space there
    if (spaceOnRight >= popupWidth) {
      position = 'right';
      popupX = containerRect.right + 4; // 4px margin - closer to image
    } else if (spaceOnLeft >= popupWidth) {
      position = 'left';
      popupX = containerRect.left - popupWidth - 4; // 4px margin - closer to image
    } else {
      // If neither side has enough space, use the side with more space
      if (spaceOnRight >= spaceOnLeft) {
        position = 'right';
        popupX = containerRect.right + 4;
      } else {
        position = 'left';
        popupX = containerRect.left - popupWidth - 4;
      }
    }

    setPopupPosition(position);
    setPopupCoordinates({ x: popupX, y: centerY });
  };

  useEffect(() => {
    if (isVisible) {
      calculatePopupPosition();
      // Recalculate on window resize
      const handleResize = () => calculatePopupPosition();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [isVisible]);

  useEffect(() => {
    // Handle click outside and escape key
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isVisible &&
        containerRef.current &&
        portalRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !portalRef.current.contains(event.target as Node)
      ) {
        closePortal();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        closePortal();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isVisible]);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const getPopupOptions = () => {
    const options = [];

    if (!hasImage) {
      options.push({
        label: 'Upload',
        icon: <FaUpload className="w-3 h-3" />,
        action: handleUploadClick,
        disabled: isUploading || isDeleting,
      });
    } else {
      options.push({
        label: 'Edit',
        icon: <FaEdit className="w-3 h-3" />,
        action: handleUploadClick,
        disabled: isUploading || isDeleting,
      });
      // Always show delete option when image exists
      options.push({
        label: 'Hapus',
        icon: <FaTrash className="w-3 h-3" />,
        action: onImageDelete ? handleDeleteImage : () => alert('Fitur hapus gambar belum tersedia untuk komponen ini'),
        disabled: isUploading || isDeleting,
      });
    }

    return options;
  };

  return (
    <div className="relative inline-block">
      <div
        ref={containerRef}
        className={`relative group ${className} ${getBorderRadiusClass()} overflow-hidden cursor-pointer`}
        onMouseEnter={() => handleMouseEnter('container')}
        onMouseLeave={() => handleMouseLeave('container')}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        tabIndex={0}
        role="button"
        aria-label={hasImage ? 'Edit or delete image' : 'Upload image'}
      >
        {children}

        {/* Loading overlay */}
        {(isUploading || isDeleting) && (
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/50 ${getBorderRadiusClass()}`}
          >
            {loadingIcon}
          </div>
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
      </div>

      {/* Mini popup modal rendered via Portal */}
      {isVisible &&
        !disabled &&
        !isUploading &&
        !isDeleting &&
        createPortal(
          <div
            ref={portalRef}
            className="fixed z-[9999]"
            style={{
              left: popupCoordinates.x,
              top: popupCoordinates.y,
              transform: 'translateY(-50%)',
            }}
            onMouseEnter={() => handleMouseEnter('popup')}
            onMouseLeave={() => handleMouseLeave('popup')}
          >
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[90px] animate-in fade-in-0 zoom-in-95 duration-200">
              {getPopupOptions().map(option => (
                <button
                  key={option.label}
                  onClick={option.action}
                  disabled={option.disabled}
                  className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2 cursor-pointer"
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
            {/* Dynamic Arrow */}
            {popupPosition === 'right' ? (
              <div className="absolute right-full top-1/2 transform -translate-y-1/2">
                <div className="w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-gray-200"></div>
                <div className="absolute w-0 h-0 border-t-4 border-b-4 border-r-4 border-t-transparent border-b-transparent border-r-white right-[-1px] top-[-4px]"></div>
              </div>
            ) : (
              <div className="absolute left-full top-1/2 transform -translate-y-1/2">
                <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-gray-200"></div>
                <div className="absolute w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-white left-[-1px] top-[-4px]"></div>
              </div>
            )}
          </div>,
          document.body
        )}

      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
    </div>
  );
};

export default ImageUploader;
