import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ImageUploaderProps } from '@/types';
import { ClipLoader } from 'react-spinners';
import toast from 'react-hot-toast';
import { getImageUploaderBorderRadiusClass } from './image-uploader/borderRadius';
import ImageUploaderPopupPortal from './image-uploader/ImageUploaderPopupPortal';
import {
  getImageUploaderAnchoredPopupGeometry,
  getImageUploaderClickPopupCoordinates,
  getImageUploaderPopupSize,
  type ImageUploaderPopupPosition,
} from './image-uploader/popupGeometry';
import { getImageUploaderPopupOptions } from './image-uploader/popupOptions';

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
  loadingIcon = <ClipLoader color="oklch(100% 0 0)" size={20} loading={true} />,
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
  const [popupPosition, setPopupPosition] =
    useState<ImageUploaderPopupPosition>('right');
  const [popupCoordinates, setPopupCoordinates] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const popupOpenFrameRef = useRef<number | null>(null);
  const popupCloseTimerRef = useRef<number | null>(null);
  const containerHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const popupHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const asyncOperationGenerationRef = useRef(0);
  const mountedRef = useRef(true);
  // Use explicit hasImage prop instead of trying to detect from children

  const isDirect = interaction === 'direct';
  const isClickTrigger = popupTrigger === 'click';
  const borderRadiusClass = getImageUploaderBorderRadiusClass(shape);
  const isInteractionDisabled = disabled || isUploading || isDeleting;

  // Combined hover and focus state
  const isVisible = isClickTrigger
    ? isFocused || isHoveringPopup
    : isHoveringContainer || isHoveringPopup || isFocused;
  const shouldShowPopup = !isDirect || hasImage;
  const canShowPopup =
    shouldShowPopup &&
    isVisible &&
    !isPopupSuppressed &&
    !isInteractionDisabled;

  const clearHoverTimeout = useCallback((target: 'container' | 'popup') => {
    const timeoutRef =
      target === 'container' ? containerHideTimeoutRef : popupHideTimeoutRef;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cancelPopupOpenFrame = useCallback(() => {
    if (popupOpenFrameRef.current === null) {
      return;
    }

    window.cancelAnimationFrame(popupOpenFrameRef.current);
    popupOpenFrameRef.current = null;
  }, []);

  // Function to close the portal
  const closePortal = useCallback(() => {
    cancelPopupOpenFrame();
    setIsHoveringContainer(false);
    setIsHoveringPopup(false);
    setIsFocused(false);
    clearHoverTimeout('container');
    clearHoverTimeout('popup');
  }, [cancelPopupOpenFrame, clearHoverTimeout]);

  useEffect(() => {
    if (!isInteractionDisabled) {
      return;
    }

    closePortal();
  }, [closePortal, isInteractionDisabled]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    event.stopPropagation();

    const file = event.target.files?.[0];
    if (!file) return;

    if (!validTypes.includes(file.type)) {
      setError(
        `Tipe file tidak valid. Harap unggah file ${validTypes.join(', ')}.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setError(null);
    const operationGeneration = asyncOperationGenerationRef.current + 1;
    asyncOperationGenerationRef.current = operationGeneration;
    const isCurrentOperation = () =>
      mountedRef.current &&
      asyncOperationGenerationRef.current === operationGeneration;

    try {
      await onImageUpload(file);
    } catch (uploadError) {
      if (!isCurrentOperation()) return;
      console.error('Error during image upload callback:', uploadError);
      setError('Gagal memproses gambar.');
    } finally {
      if (isCurrentOperation()) {
        setIsUploading(false);
      }
      if (isCurrentOperation() && fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = useCallback(async () => {
    if (!onImageDelete || isDeleting || disabled) return;

    setIsDeleting(true);
    setError(null);
    const operationGeneration = asyncOperationGenerationRef.current + 1;
    asyncOperationGenerationRef.current = operationGeneration;
    const isCurrentOperation = () =>
      mountedRef.current &&
      asyncOperationGenerationRef.current === operationGeneration;

    try {
      await onImageDelete();
    } catch (deleteError) {
      if (!isCurrentOperation()) return;
      console.error('Error during image deletion:', deleteError);
      setError('Gagal menghapus gambar.');
    } finally {
      if (isCurrentOperation()) {
        setIsDeleting(false);
      }
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

  const getPopupOptions = useCallback(
    () =>
      getImageUploaderPopupOptions({
        closePortal,
        handleDeleteImage,
        handleUploadClick,
        hasImage,
        isDeleting,
        isUploading,
        onImageDelete,
        onUnavailableDelete: () => {
          toast.error('Fitur hapus gambar belum tersedia untuk komponen ini');
        },
        onPopupClose,
      }),
    [
      closePortal,
      handleDeleteImage,
      handleUploadClick,
      hasImage,
      isDeleting,
      isUploading,
      onImageDelete,
      onPopupClose,
    ]
  );

  const positionPopupAtClick = useCallback(
    (clickX: number, clickY: number) => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const popupRect = portalRef.current?.getBoundingClientRect();
      const options = getPopupOptions();
      const hasDelete = options.some(option => option.label === 'Hapus');
      const { height: popupHeight, width: popupWidth } =
        getImageUploaderPopupSize({
          hasDelete,
          measuredRect: popupRect,
          optionCount: options.length,
        });

      setPopupCoordinates(
        getImageUploaderClickPopupCoordinates({
          clickX,
          clickY,
          popupHeight,
          popupWidth,
          viewportHeight,
          viewportWidth,
        })
      );
    },
    [getPopupOptions]
  );

  const handleContainerClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (isInteractionDisabled) return;

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
      isInteractionDisabled,
      positionPopupAtClick,
      isFocused,
      closePortal,
    ]
  );

  const handleMouseEnter = (target: 'container' | 'popup') => {
    if (isInteractionDisabled) return;
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
    if (isInteractionDisabled) return;
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

    const { coordinates, position } = getImageUploaderAnchoredPopupGeometry({
      containerRect,
      popupWidth,
      viewportWidth,
    });

    setPopupPosition(position);
    setPopupCoordinates(coordinates);
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
      if (!isPopupVisible && popupOpenFrameRef.current === null) {
        const frameId = window.requestAnimationFrame(() => {
          if (popupOpenFrameRef.current === frameId) {
            popupOpenFrameRef.current = null;
            setIsPopupVisible(true);
          }
        });
        popupOpenFrameRef.current = frameId;
      }
      return;
    }

    cancelPopupOpenFrame();
    if (!isPopupMounted) return;
    setIsPopupVisible(false);
    if (popupCloseTimerRef.current) {
      window.clearTimeout(popupCloseTimerRef.current);
    }
    popupCloseTimerRef.current = window.setTimeout(() => {
      setIsPopupMounted(false);
      popupCloseTimerRef.current = null;
    }, 150);
  }, [cancelPopupOpenFrame, canShowPopup, isPopupMounted, isPopupVisible]);

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
      if (!(event.target instanceof Node)) {
        return;
      }

      if (
        isVisible &&
        containerRef.current &&
        portalRef.current &&
        !containerRef.current.contains(event.target) &&
        !portalRef.current.contains(event.target)
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
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      asyncOperationGenerationRef.current += 1;
      cancelPopupOpenFrame();
      if (popupCloseTimerRef.current) {
        window.clearTimeout(popupCloseTimerRef.current);
      }
      clearHoverTimeout('container');
      clearHoverTimeout('popup');
    };
  }, [cancelPopupOpenFrame, clearHoverTimeout]);

  const containerInteractionProps = isInteractionDisabled
    ? {}
    : {
        onMouseEnter: () => handleMouseEnter('container'),
        onMouseLeave: () => handleMouseLeave('container'),
        onClick: handleContainerClick,
        onFocus: () => {
          if (!isClickTrigger) {
            setIsFocused(true);
          }
        },
        onBlur: () => {
          if (!isClickTrigger) {
            setIsFocused(false);
          }
        },
        tabIndex: tabIndex ?? 0,
        role: 'button',
        'aria-label': hasImage ? 'Edit or delete image' : 'Upload image',
      };

  return (
    <div className="relative inline-block">
      <div
        ref={containerRef}
        {...containerInteractionProps}
        className={`relative group ${className} ${borderRadiusClass} overflow-hidden ${
          isInteractionDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
        } outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0`}
      >
        {children}

        {/* Loading overlay */}
        {(isUploading || isDeleting) && loadingIcon !== null && (
          <div
            className={`absolute inset-0 flex items-center justify-center bg-black/50 ${borderRadiusClass}`}
          >
            {loadingIcon}
          </div>
        )}

        <input
          id={id}
          ref={fileInputRef}
          type="file"
          aria-label={hasImage ? 'Edit image file' : 'Upload image file'}
          className="hidden"
          accept={validTypes.join(',')}
          onChange={handleFileChange}
          disabled={isInteractionDisabled}
        />
      </div>

      {/* Mini popup modal rendered via Portal */}
      {isPopupMounted && (
        <ImageUploaderPopupPortal
          coordinates={popupCoordinates}
          isClickTrigger={isClickTrigger}
          isVisible={isPopupVisible}
          onMouseEnter={() => handleMouseEnter('popup')}
          onMouseLeave={() => handleMouseLeave('popup')}
          options={getPopupOptions()}
          popupPosition={popupPosition}
          portalRef={portalRef}
        />
      )}

      {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
    </div>
  );
};

export default ImageUploader;
