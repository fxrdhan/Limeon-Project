import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ImageUploaderProps } from '@/types';
import { ClipLoader } from 'react-spinners';
import { RxPencil2, RxTrash } from 'react-icons/rx';
import { LuUpload } from 'react-icons/lu';
import Button from '@/components/button';

const ImageUploader: React.FC<ImageUploaderProps> = ({
  id,
  onImageUpload,
  onImageDelete,
  children,
  hasImage = false,
  validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  className = '',
  disabled = false,
  loadingIcon = <ClipLoader color="#ffffff" size={20} loading={true} />,
  shape = 'full',
  interaction = 'menu',
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

  const isDirect = interaction === 'direct';

  // Combined hover and focus state
  const isVisible = isHoveringContainer || isHoveringPopup || isFocused;
  const shouldShowPopup = !isDirect || hasImage;

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
    event.stopPropagation();

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

  const handleDeleteImage = useCallback(async () => {
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
  }, [onImageDelete, isDeleting, disabled]);

  const handleUploadClick = useCallback(() => {
    if (fileInputRef.current && !disabled && !isUploading && !isDeleting) {
      fileInputRef.current.click();
    }
  }, [disabled, isUploading, isDeleting]);

  const handleContainerClick = useCallback(() => {
    if (!isDirect) return;
    handleUploadClick();
  }, [handleUploadClick, isDirect]);

  const getPopupOptions = useCallback(() => {
    const options = [];

    if (!hasImage) {
      options.push({
        label: 'Upload',
        icon: <LuUpload className="w-4 h-4" />,
        action: handleUploadClick,
        disabled: isUploading || isDeleting,
      });
    } else {
      options.push({
        label: 'Edit',
        icon: <RxPencil2 className="w-4 h-4" />,
        action: handleUploadClick,
        disabled: isUploading || isDeleting,
      });
      // Always show delete option when image exists
      options.push({
        label: 'Hapus',
        icon: <RxTrash className="w-4 h-4" />,
        action: onImageDelete
          ? handleDeleteImage
          : () => {
              alert('Fitur hapus gambar belum tersedia untuk komponen ini');
            },
        disabled: isUploading || isDeleting,
      });
    }

    return options;
  }, [
    hasImage,
    handleUploadClick,
    isUploading,
    isDeleting,
    onImageDelete,
    handleDeleteImage,
  ]);

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

  const calculatePopupPosition = useCallback(() => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    // Get actual popup width by measuring the portal content
    let popupWidth = 120; // Default fallback width
    if (portalRef.current) {
      const popupRect = portalRef.current.getBoundingClientRect();
      popupWidth = popupRect.width || 120;
    } else {
      // Estimate based on content - more conservative estimate
      const options = getPopupOptions();
      const hasDelete = options.some(option => option.label === 'Hapus');
      popupWidth = hasDelete ? 120 : 100; // Wider if delete option exists
    }

    const margin = 8; // Margin from container edge
    const spaceOnRight = viewportWidth - containerRect.right - margin;
    const spaceOnLeft = containerRect.left - margin;

    // Calculate popup coordinates relative to viewport
    const centerY = containerRect.top + containerRect.height / 2;
    let popupX: number;
    let position: 'left' | 'right';

    // Prefer right if there's enough space, otherwise use left if there's space there
    if (spaceOnRight >= popupWidth) {
      position = 'right';
      popupX = containerRect.right + margin;
    } else if (spaceOnLeft >= popupWidth) {
      position = 'left';
      popupX = containerRect.left - popupWidth - margin;
    } else {
      // If neither side has enough space, use the side with more space
      // But still respect the minimum space requirements
      if (spaceOnRight >= spaceOnLeft) {
        position = 'right';
        popupX = Math.min(
          containerRect.right + margin,
          viewportWidth - popupWidth - 8
        );
      } else {
        position = 'left';
        popupX = Math.max(containerRect.left - popupWidth - margin, 8);
      }
    }

    setPopupPosition(position);
    setPopupCoordinates({ x: popupX, y: centerY });
  }, [getPopupOptions]);

  useEffect(() => {
    if (isVisible) {
      // Initial calculation
      calculatePopupPosition();

      // Recalculate after popup is rendered to get accurate dimensions
      const timer = setTimeout(() => {
        calculatePopupPosition();
      }, 10);

      // Recalculate on window resize
      const handleResize = () => calculatePopupPosition();
      window.addEventListener('resize', handleResize);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isVisible, hasImage, calculatePopupPosition]); // Added hasImage dependency to recalculate when popup content changes

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

  return (
    <div className="relative inline-block">
      <div
        ref={containerRef}
        className={`relative group ${className} ${getBorderRadiusClass()} overflow-hidden cursor-pointer`}
        onMouseEnter={() => handleMouseEnter('container')}
        onMouseLeave={() => handleMouseLeave('container')}
        onClick={handleContainerClick}
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
      {shouldShowPopup &&
        isVisible &&
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
            <div className="px-1 py-1 bg-white border border-gray-200 rounded-xl shadow-lg min-w-[90px] animate-in fade-in-0 zoom-in-95 duration-200">
              {getPopupOptions().map(option => (
                <Button
                  key={option.label}
                  variant={option.label === 'Hapus' ? 'text-danger' : 'text'}
                  size="sm"
                  withUnderline={false}
                  onClick={event => {
                    event.stopPropagation();
                    option.action();
                  }}
                  disabled={option.disabled}
                  className={`w-full px-3 py-2 text-left disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 first:rounded-t-lg last:rounded-b-lg flex items-center gap-2 cursor-pointer justify-start ${
                    option.label === 'Hapus'
                      ? ''
                      : 'hover:bg-gray-200 text-gray-700 hover:text-gray-900'
                  }`}
                >
                  {option.icon}
                  {option.label}
                </Button>
              ))}
            </div>
            {/* Dynamic Arrow */}
            {popupPosition === 'right' ? (
              <div className="absolute right-full top-1/2 transform -translate-y-1/2">
                <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent border-r-gray-200"></div>
                <div className="absolute w-0 h-0 border-t-[5px] border-b-[5px] border-r-[5px] border-t-transparent border-b-transparent border-r-white right-[-1px] top-1/2 transform -translate-y-1/2"></div>
              </div>
            ) : (
              <div className="absolute left-full top-1/2 transform -translate-y-1/2">
                <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-l-[6px] border-t-transparent border-b-transparent border-l-gray-200"></div>
                <div className="absolute w-0 h-0 border-t-[5px] border-b-[5px] border-l-[5px] border-t-transparent border-b-transparent border-l-white left-[-1px] top-1/2 transform -translate-y-1/2"></div>
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
