import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
  type TouchEvent,
  type WheelEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvoiceUploadStore } from './invoiceUploadStore';
import {
  buildConfirmInvoiceNavigationState,
  getInvoiceExtractionErrorMessage,
  getInvoiceImageValidationError,
  getNextInvoicePreviewZoomLevel,
  isPointerWithinRect,
} from '../../domain/uploadInvoiceUtils';
import { uploadAndExtractPurchaseInvoice } from '../../infrastructure/uploadInvoiceData';

interface UseUploadInvoicePortalOptions {
  isOpen: boolean;
  onClose: () => void;
}

export function useUploadInvoicePortal({
  isOpen,
  onClose,
}: UseUploadInvoicePortalOptions) {
  const { cachedInvoiceFile, setCachedInvoiceFile, clearCachedInvoiceFile } =
    useInvoiceUploadStore();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileInputKey, setFileInputKey] = useState<number>(0);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [shouldShowGlow, setShouldShowGlow] = useState(false);
  const [glowIntensity, setGlowIntensity] = useState(0);

  const glowAnimationRef = useRef<NodeJS.Timeout | null>(null);
  const glowAnimationFrameRef = useRef<number | null>(null);
  const resetTransformFrameRef = useRef<number | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const uploaderContainerRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const uploadRequestIdRef = useRef(0);

  isOpenRef.current = isOpen;

  const invalidateActiveUpload = useCallback(() => {
    uploadRequestIdRef.current += 1;
  }, []);

  const clearGlowAnimation = useCallback(() => {
    if (glowAnimationRef.current) {
      clearTimeout(glowAnimationRef.current);
      glowAnimationRef.current = null;
    }
    if (glowAnimationFrameRef.current !== null) {
      cancelAnimationFrame(glowAnimationFrameRef.current);
      glowAnimationFrameRef.current = null;
    }
  }, []);

  const clearThrottleTimeout = useCallback(() => {
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }
  }, []);

  const clearResetTransformFrame = useCallback(() => {
    if (resetTransformFrameRef.current !== null) {
      cancelAnimationFrame(resetTransformFrameRef.current);
      resetTransformFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    if (!isOpen) {
      invalidateActiveUpload();
      setFile(null);
      setError(null);
      setLoading(false);
      setPreviewUrl(null);
      setIsDragging(false);
      setShowFullPreview(false);
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
      setIsHovering(false);
      setShouldShowGlow(false);
      setGlowIntensity(0);
      clearGlowAnimation();
      clearThrottleTimeout();
      clearResetTransformFrame();
    }

    return clearGlowAnimation;
  }, [
    clearGlowAnimation,
    clearResetTransformFrame,
    clearThrottleTimeout,
    invalidateActiveUpload,
    isOpen,
  ]);

  useEffect(() => {
    return () => {
      isOpenRef.current = false;
      invalidateActiveUpload();
      clearGlowAnimation();
      clearThrottleTimeout();
      clearResetTransformFrame();
    };
  }, [
    clearGlowAnimation,
    clearResetTransformFrame,
    clearThrottleTimeout,
    invalidateActiveUpload,
  ]);

  useEffect(() => {
    const handleMouseMove = (event: globalThis.MouseEvent) => {
      if (throttleTimeoutRef.current) return;

      mousePositionRef.current = { x: event.clientX, y: event.clientY };

      throttleTimeoutRef.current = setTimeout(() => {
        throttleTimeoutRef.current = null;
      }, 8);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearThrottleTimeout();
    };
  }, [clearThrottleTimeout]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.pointerEvents = 'auto';

      if (cachedInvoiceFile) {
        setFile(cachedInvoiceFile);
      }

      const checkInitialHover = () => {
        if (!file && uploaderContainerRef.current) {
          const rect = uploaderContainerRef.current.getBoundingClientRect();
          const mouseX = mousePositionRef.current.x;
          const mouseY = mousePositionRef.current.y;

          if (mouseX === 0 && mouseY === 0) return;

          if (isPointerWithinRect({ x: mouseX, y: mouseY }, rect)) {
            setIsHovering(true);
            setShouldShowGlow(true);
            setGlowIntensity(0.7);

            clearGlowAnimation();

            let currentIntensity = 0.7;
            const animateGlow = () => {
              currentIntensity += 0.1;
              if (currentIntensity <= 1) {
                setGlowIntensity(currentIntensity);
                glowAnimationRef.current = setTimeout(animateGlow, 4);
              }
            };
            animateGlow();
          }
        }
      };

      checkInitialHover();
      const timeoutId = setTimeout(checkInitialHover, 16);

      const handlePortalMouseMove = (event: globalThis.MouseEvent) => {
        mousePositionRef.current = { x: event.clientX, y: event.clientY };
        checkInitialHover();
      };

      document.addEventListener('mousemove', handlePortalMouseMove, {
        passive: true,
        once: true,
      });

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousemove', handlePortalMouseMove);
        clearGlowAnimation();
      };
    } else {
      document.body.style.pointerEvents = 'auto';

      setError(null);
      setLoading(false);
      setIsDragging(false);
      setShowFullPreview(false);
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
      setIsHovering(false);
      setShouldShowGlow(false);
      setGlowIntensity(0);

      clearGlowAnimation();
      clearThrottleTimeout();
      clearResetTransformFrame();

      resetTransformFrameRef.current = requestAnimationFrame(() => {
        resetTransformFrameRef.current = null;
        if (uploaderContainerRef.current) {
          uploaderContainerRef.current.style.transform = 'translateZ(0)';
        }
      });
    }
  }, [
    cachedInvoiceFile,
    clearGlowAnimation,
    clearResetTransformFrame,
    clearThrottleTimeout,
    file,
    isOpen,
  ]);

  const applySelectedFile = (
    selectedFile: File,
    { clearFileOnError }: { clearFileOnError: boolean }
  ) => {
    const validationError = getInvoiceImageValidationError(selectedFile);
    if (validationError) {
      setError(validationError);
      if (clearFileOnError) {
        setFile(null);
      }
      return;
    }

    setFile(selectedFile);
    setCachedInvoiceFile(selectedFile);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    setError(null);
    if (!selectedFile) return;
    applySelectedFile(selectedFile, { clearFileOnError: true });
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    setError(null);
    const droppedFile = event.dataTransfer.files[0];
    if (!droppedFile) return;
    applySelectedFile(droppedFile, { clearFileOnError: false });
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Pilih file faktur terlebih dahulu.');
      return;
    }

    const uploadRequestId = uploadRequestIdRef.current + 1;
    uploadRequestIdRef.current = uploadRequestId;
    const isCurrentUpload = () =>
      isOpenRef.current && uploadRequestIdRef.current === uploadRequestId;

    try {
      setLoading(true);
      setError(null);
      const startTime = Date.now();
      const data = await uploadAndExtractPurchaseInvoice(file);
      if (!isCurrentUpload()) {
        return;
      }

      const completedAtMs = Date.now();
      clearCachedInvoiceFile();
      onClose();
      void navigate('/purchases/confirm-invoice', {
        state: buildConfirmInvoiceNavigationState({
          completedAtMs,
          extractedData: data,
          filePreview: previewUrl,
          startedAtMs: startTime,
        }),
      });
    } catch (err: unknown) {
      if (isCurrentUpload()) {
        setError(getInvoiceExtractionErrorMessage(err));
      }
    } finally {
      if (isCurrentUpload()) {
        setLoading(false);
      }
    }
  };

  const handleRemoveFile = (event?: MouseEvent | TouchEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    setFile(null);
    setPreviewUrl(null);
    invalidateActiveUpload();
    setLoading(false);
    setFileInputKey(prev => prev + 1);
    setError(null);
    setShowFullPreview(false);
    setIsHovering(false);
    setShouldShowGlow(false);
    setGlowIntensity(0);
    setIsDragging(false);
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });

    clearGlowAnimation();
    clearThrottleTimeout();
    clearResetTransformFrame();

    clearCachedInvoiceFile();

    requestAnimationFrame(() => {});
  };

  const toggleFullPreview = () => {
    setShowFullPreview(prev => !prev);
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setPosition({ x, y });
  };

  const handleZoom = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    setZoomLevel(currentZoom =>
      getNextInvoicePreviewZoomLevel(currentZoom, event.deltaY)
    );
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleUploaderMouseEnter = () => {
    if (!isHovering) {
      setIsHovering(true);
      clearGlowAnimation();
      setShouldShowGlow(true);
      setGlowIntensity(0.8);

      let currentIntensity = 0.8;
      const animateGlow = () => {
        currentIntensity += 0.1;
        if (currentIntensity <= 1) {
          setGlowIntensity(currentIntensity);
          glowAnimationRef.current = setTimeout(animateGlow, 3);
        }
      };
      glowAnimationFrameRef.current = requestAnimationFrame(() => {
        glowAnimationFrameRef.current = null;
        animateGlow();
      });
    }
  };

  const handleUploaderMouseLeave = (event: MouseEvent<HTMLDivElement>) => {
    const rect = uploaderContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const isStillInside = isPointerWithinRect(
        { x: event.clientX, y: event.clientY },
        rect
      );

      if (!isStillInside) {
        setIsHovering(false);
        clearGlowAnimation();

        let currentIntensity = glowIntensity;
        const fadeGlow = () => {
          currentIntensity -= 0.4;
          if (currentIntensity > 0) {
            setGlowIntensity(currentIntensity);
            glowAnimationRef.current = setTimeout(fadeGlow, 2);
          } else {
            setGlowIntensity(0);
            setShouldShowGlow(false);
          }
        };
        glowAnimationFrameRef.current = requestAnimationFrame(() => {
          glowAnimationFrameRef.current = null;
          fadeGlow();
        });
      }
    }
  };

  const handlePortalClose = () => {
    invalidateActiveUpload();
    setLoading(false);

    if (showFullPreview) {
      setShowFullPreview(false);
    }

    setIsHovering(false);
    setShouldShowGlow(false);
    setGlowIntensity(0);
    setIsDragging(false);

    clearGlowAnimation();
    clearThrottleTimeout();
    clearResetTransformFrame();

    document.body.style.pointerEvents = 'auto';

    onClose();
  };

  const handleCancel = () => {
    invalidateActiveUpload();
    setLoading(false);
    clearGlowAnimation();
    clearThrottleTimeout();
    clearResetTransformFrame();
    onClose();
  };

  const handleModalClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!file && uploaderContainerRef.current) {
      const rect = uploaderContainerRef.current.getBoundingClientRect();
      if (
        isPointerWithinRect({ x: event.clientX, y: event.clientY }, rect) &&
        !isHovering
      ) {
        setIsHovering(true);
        setShouldShowGlow(true);
        setGlowIntensity(0.8);
      }
    }
  };

  const handleFullPreviewClose = () => {
    setShowFullPreview(false);
    resetZoom();
    setIsHovering(false);
    setShouldShowGlow(false);
    setGlowIntensity(0);

    clearGlowAnimation();
  };

  return {
    fullPreviewPortalProps: {
      imageContainerRef,
      onClose: handleFullPreviewClose,
      onMouseMove: handleMouseMove,
      onWheel: handleZoom,
      position,
      previewUrl,
      showFullPreview,
      zoomLevel,
    },
    uploadDialogPortalProps: {
      error,
      file,
      fileInputKey,
      glowIntensity,
      isDragging,
      isHovering,
      isOpen,
      loading,
      onBackdropClick: handlePortalClose,
      onCancel: handleCancel,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
      onFileChange: handleFileChange,
      onModalClick: handleModalClick,
      onRemoveFile: handleRemoveFile,
      onToggleFullPreview: toggleFullPreview,
      onUpload: handleUpload,
      onUploaderMouseEnter: handleUploaderMouseEnter,
      onUploaderMouseLeave: handleUploaderMouseLeave,
      previewUrl,
      shouldShowGlow,
      uploaderContainerRef,
    },
  };
}
