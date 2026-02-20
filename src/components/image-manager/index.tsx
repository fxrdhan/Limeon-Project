import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ImageUploaderProps } from '@/types';
import { ClipLoader } from 'react-spinners';
import { TbEdit, TbTrash, TbUpload, TbX } from 'react-icons/tb';
import PopupMenuContent from './PopupMenuContent';

const ImageUploader: React.FC<ImageUploaderProps> = ({
  id,
  onImageUpload,
  onImageDelete,
  onPopupClose,
  children,
  hasImage = false,
  validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  className = '',
  disabled = false,
  tabIndex,
  loadingIcon = <ClipLoader color="#ffffff" size={20} loading={true} />,
  shape = 'full',
  interaction = 'menu',
  popupTrigger = 'hover',
  isPopupSuppressed = false,
}) => {
  const [isHoveringContainer, setIsHoveringContainer] = useState(false);
  const [isHoveringPopup, setIsHoveringPopup] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPopupMounted, setIsPopupMounted] = useState(false);
  const [isPopupVisible, setIsPopupVisible] = useState(false);
  const [popupPosition, setPopupPosition] = useState<'left' | 'right'>('right');
  const [popupCoordinates, setPopupCoordinates] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const popupCloseTimerRef = useRef<number | null>(null);
  const containerHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const popupHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Use explicit hasImage prop instead of trying to detect from children

  const isDirect = interaction === 'direct';
  const isClickTrigger = popupTrigger === 'click';

  // Combined hover and focus state
  const isVisible = isClickTrigger
    ? isFocused || isHoveringPopup
    : isHoveringContainer || isHoveringPopup || isFocused;
  const shouldShowPopup = !isDirect || hasImage;
  const canShowPopup =
    shouldShowPopup &&
    isVisible &&
    !isPopupSuppressed &&
    !disabled &&
    !isUploading &&
    !isDeleting;

  const clearHoverTimeout = useCallback((target: 'container' | 'popup') => {
    const timeoutRef =
      target === 'container' ? containerHideTimeoutRef : popupHideTimeoutRef;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Function to close the portal
  const closePortal = useCallback(() => {
    setIsHoveringContainer(false);
    setIsHoveringPopup(false);
    setIsFocused(false);
    clearHoverTimeout('container');
    clearHoverTimeout('popup');
  }, [clearHoverTimeout]);

  const getBorderRadiusClass = () => {
    switch (shape) {
      case 'rounded':
        return 'rounded-lg';
      case 'rounded-sm':
        return 'rounded-lg';
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
    if (!fileInputRef.current || disabled || isUploading || isDeleting) return;

    // Ensure same file can be re-selected after cancel.
    fileInputRef.current.value = '';
    if (typeof fileInputRef.current.showPicker === 'function') {
      try {
        fileInputRef.current.showPicker();
        return;
      } catch {
        // Fallback to click if showPicker isn't allowed.
      }
    }
    fileInputRef.current.click();
  }, [disabled, isUploading, isDeleting]);

  const getPopupOptions = useCallback(() => {
    const options = [];

    if (!hasImage) {
      options.push({
        label: 'Upload',
        icon: <TbUpload className="w-4 h-4" />,
        action: handleUploadClick,
        disabled: isUploading || isDeleting,
      });
    } else {
      if (onPopupClose) {
        options.push({
          label: 'Tutup',
          icon: <TbX className="w-4 h-4" />,
          action: () => {
            closePortal();
            onPopupClose();
          },
          disabled: isUploading || isDeleting,
        });
      }

      options.push({
        label: 'Edit',
        icon: <TbEdit className="w-4 h-4" />,
        action: handleUploadClick,
        disabled: isUploading || isDeleting,
      });
      // Always show delete option when image exists
      options.push({
        label: 'Hapus',
        icon: <TbTrash className="w-4 h-4" />,
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
    onPopupClose,
    closePortal,
  ]);

  const positionPopupAtClick = useCallback(
    (clickX: number, clickY: number) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popupRect = portalRef.current?.getBoundingClientRect();
      const options = getPopupOptions();
      const hasDelete = options.some(option => option.label === 'Hapus');

      const popupWidth = popupRect?.width || (hasDelete ? 120 : 100);
      const popupHeight = popupRect?.height || options.length * 36 + 8;
      const margin = 8;

      const clampedX = Math.min(
        Math.max(clickX, margin),
        viewportWidth - popupWidth - margin
      );
      const clampedY = Math.min(
        Math.max(clickY, margin),
        viewportHeight - popupHeight - margin
      );

      setPopupCoordinates({ x: clampedX, y: clampedY });
    },
    [getPopupOptions]
  );

  const handleContainerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (isDirect) {
        handleUploadClick();
        return;
      }

      if (isClickTrigger) {
        if (isFocused) {
          closePortal();
          return;
        }
        positionPopupAtClick(event.clientX, event.clientY);
        setIsFocused(true);
      }
    },
    [
      handleUploadClick,
      isClickTrigger,
      isDirect,
      positionPopupAtClick,
      isFocused,
      closePortal,
    ]
  );

  const handleMouseEnter = (target: 'container' | 'popup') => {
    if (target === 'container' && isClickTrigger) {
      return;
    }
    clearHoverTimeout(target);

    if (target === 'container') {
      setIsHoveringContainer(true);
    } else {
      setIsHoveringPopup(true);
    }
  };

  const handleMouseLeave = (target: 'container' | 'popup') => {
    if (target === 'container' && isClickTrigger) {
      return;
    }
    clearHoverTimeout(target);

    const timeoutRef =
      target === 'container' ? containerHideTimeoutRef : popupHideTimeoutRef;

    // Add delay before updating state to allow mouse movement between areas
    timeoutRef.current = setTimeout(() => {
      if (target === 'container') {
        setIsHoveringContainer(false);
      } else {
        setIsHoveringPopup(false);
      }
      timeoutRef.current = null;
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
    if (isPopupSuppressed) {
      closePortal();
    }
  }, [isPopupSuppressed, closePortal]);

  useEffect(() => {
    if (canShowPopup) {
      if (popupCloseTimerRef.current) {
        window.clearTimeout(popupCloseTimerRef.current);
        popupCloseTimerRef.current = null;
      }
      if (!isPopupMounted) {
        setIsPopupMounted(true);
      }
      window.requestAnimationFrame(() => {
        setIsPopupVisible(true);
      });
      return;
    }

    if (!isPopupMounted) return;
    setIsPopupVisible(false);
    if (popupCloseTimerRef.current) {
      window.clearTimeout(popupCloseTimerRef.current);
    }
    popupCloseTimerRef.current = window.setTimeout(() => {
      setIsPopupMounted(false);
      popupCloseTimerRef.current = null;
    }, 150);
  }, [canShowPopup, isPopupMounted]);

  useEffect(() => {
    if (!isVisible || isClickTrigger) return;

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
  }, [isVisible, hasImage, calculatePopupPosition, isClickTrigger]); // Added hasImage dependency to recalculate when popup content changes

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
  }, [isVisible, closePortal]);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (popupCloseTimerRef.current) {
        window.clearTimeout(popupCloseTimerRef.current);
      }
      clearHoverTimeout('container');
      clearHoverTimeout('popup');
    };
  }, [clearHoverTimeout]);

  return (
    <div className="relative inline-block">
      <div
        ref={containerRef}
        className={`relative group ${className} ${getBorderRadiusClass()} overflow-hidden cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0`}
        onMouseEnter={() => handleMouseEnter('container')}
        onMouseLeave={() => handleMouseLeave('container')}
        onClick={handleContainerClick}
        onFocus={() => {
          if (!isClickTrigger) {
            setIsFocused(true);
          }
        }}
        onBlur={() => {
          if (!isClickTrigger) {
            setIsFocused(false);
          }
        }}
        tabIndex={disabled ? -1 : (tabIndex ?? 0)}
        role="button"
        aria-label={hasImage ? 'Edit or delete image' : 'Upload image'}
      >
        {children}

        {/* Loading overlay */}
        {(isUploading || isDeleting) && loadingIcon !== null && (
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
      {isPopupMounted &&
        createPortal(
          <div
            ref={portalRef}
            className="fixed z-[9999]"
            style={{
              left: popupCoordinates.x,
              top: popupCoordinates.y,
              transform: isClickTrigger ? 'none' : 'translateY(-50%)',
            }}
            onMouseEnter={() => handleMouseEnter('popup')}
            onMouseLeave={() => handleMouseLeave('popup')}
          >
            <div
              className={`transition-all duration-150 ease-out ${
                isPopupVisible
                  ? 'opacity-100 scale-100'
                  : 'opacity-0 scale-95 pointer-events-none'
              }`}
            >
              <PopupMenuContent
                actions={getPopupOptions().map(option => ({
                  label: option.label,
                  icon: option.icon,
                  onClick: option.action,
                  disabled: option.disabled,
                  tone: option.label === 'Hapus' ? 'danger' : 'default',
                }))}
              />
              {!isClickTrigger &&
                (popupPosition === 'right' ? (
                  <div className="absolute right-full top-1/2 transform -translate-y-1/2">
                    <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-r-[6px] border-t-transparent border-b-transparent border-r-slate-200"></div>
                    <div className="absolute w-0 h-0 border-t-[5px] border-b-[5px] border-r-[5px] border-t-transparent border-b-transparent border-r-white right-[-1px] top-1/2 transform -translate-y-1/2"></div>
                  </div>
                ) : (
                  <div className="absolute left-full top-1/2 transform -translate-y-1/2">
                    <div className="w-0 h-0 border-t-[6px] border-b-[6px] border-l-[6px] border-t-transparent border-b-transparent border-l-slate-200"></div>
                    <div className="absolute w-0 h-0 border-t-[5px] border-b-[5px] border-l-[5px] border-t-transparent border-b-transparent border-l-white left-[-1px] top-1/2 transform -translate-y-1/2"></div>
                  </div>
                ))}
            </div>
          </div>,
          document.body
        )}

      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
    </div>
  );
};

export default ImageUploader;
