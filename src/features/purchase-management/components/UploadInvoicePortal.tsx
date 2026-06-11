import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
  type TouchEvent,
  type WheelEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadAndExtractInvoice } from '@/services/invoiceExtractor';
import { useInvoiceUploadStore } from '@/store/invoiceUploadStore';
import { UploadInvoiceDialogPortal } from './upload-invoice/UploadInvoiceDialogPortal';
import { InvoiceFullPreviewPortal } from './upload-invoice/InvoiceFullPreviewPortal';
import { getInvoiceImageValidationError } from './upload-invoice/uploadInvoiceUtils';

interface UploadInvoicePortalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UploadInvoicePortal = ({ isOpen, onClose }: UploadInvoicePortalProps) => {
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
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const uploaderContainerRef = useRef<HTMLDivElement>(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    const glowTimeout = glowAnimationRef.current;

    if (!isOpen) {
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
      if (glowTimeout) {
        clearTimeout(glowTimeout);
      }
    }

    return () => {
      if (glowTimeout) {
        clearTimeout(glowTimeout);
      }
    };
  }, [isOpen]);

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
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);

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

          const isWithinBounds =
            mouseX >= rect.left &&
            mouseX <= rect.right &&
            mouseY >= rect.top &&
            mouseY <= rect.bottom;

          if (isWithinBounds) {
            setIsHovering(true);
            setShouldShowGlow(true);
            setGlowIntensity(0.7);

            if (glowAnimationRef.current) {
              clearTimeout(glowAnimationRef.current);
            }

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

      if (glowAnimationRef.current) {
        clearTimeout(glowAnimationRef.current);
        glowAnimationRef.current = null;
      }
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }

      requestAnimationFrame(() => {
        if (uploaderContainerRef.current) {
          uploaderContainerRef.current.style.transform = 'translateZ(0)';
        }
      });
    }
  }, [isOpen, cachedInvoiceFile, file]);

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
    try {
      setLoading(true);
      setError(null);
      const startTime = Date.now();
      const data = await uploadAndExtractInvoice(file!);
      const imageIdentifier = data.imageIdentifier;
      const processingTime = (Date.now() - startTime) / 1000;
      clearCachedInvoiceFile();
      onClose();
      void navigate('/purchases/confirm-invoice', {
        state: {
          extractedData: data,
          filePreview: previewUrl,
          processingTime: processingTime.toFixed(1),
          imageIdentifier: imageIdentifier,
        },
      });
    } catch (err: unknown) {
      setError(
        `Gagal mengunggah dan mengekstrak faktur: ${
          err instanceof Error ? err.message : 'Terjadi kesalahan tidak dikenal'
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = (event?: MouseEvent | TouchEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    setFile(null);
    setPreviewUrl(null);
    setFileInputKey(prev => prev + 1);
    setError(null);
    setShowFullPreview(false);
    setIsHovering(false);
    setShouldShowGlow(false);
    setGlowIntensity(0);
    setIsDragging(false);
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });

    if (glowAnimationRef.current) {
      clearTimeout(glowAnimationRef.current);
      glowAnimationRef.current = null;
    }
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }

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
    const zoomIncrement = 0.1;
    const direction = event.deltaY > 0 ? 1 : -1;
    setZoomLevel(currentZoom => {
      const newZoom = currentZoom + direction * zoomIncrement;
      return Math.min(Math.max(newZoom, 1), 3);
    });
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleUploaderMouseEnter = () => {
    if (!isHovering) {
      setIsHovering(true);
      if (glowAnimationRef.current) {
        clearTimeout(glowAnimationRef.current);
      }
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
      requestAnimationFrame(animateGlow);
    }
  };

  const handleUploaderMouseLeave = (event: MouseEvent<HTMLDivElement>) => {
    const rect = uploaderContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const isStillInside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;

      if (!isStillInside) {
        setIsHovering(false);
        if (glowAnimationRef.current) {
          clearTimeout(glowAnimationRef.current);
        }

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
        requestAnimationFrame(fadeGlow);
      }
    }
  };

  const handlePortalClose = () => {
    if (showFullPreview) {
      setShowFullPreview(false);
    }

    setIsHovering(false);
    setShouldShowGlow(false);
    setGlowIntensity(0);
    setIsDragging(false);

    if (glowAnimationRef.current) {
      clearTimeout(glowAnimationRef.current);
      glowAnimationRef.current = null;
    }
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
      throttleTimeoutRef.current = null;
    }

    document.body.style.pointerEvents = 'auto';

    onClose();
  };

  const handleModalClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (!file && uploaderContainerRef.current) {
      const rect = uploaderContainerRef.current.getBoundingClientRect();
      const mouseX = event.clientX;
      const mouseY = event.clientY;

      const isWithinBounds =
        mouseX >= rect.left &&
        mouseX <= rect.right &&
        mouseY >= rect.top &&
        mouseY <= rect.bottom;

      if (isWithinBounds && !isHovering) {
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

    if (glowAnimationRef.current) {
      clearTimeout(glowAnimationRef.current);
      glowAnimationRef.current = null;
    }
  };

  return (
    <>
      <UploadInvoiceDialogPortal
        error={error}
        file={file}
        fileInputKey={fileInputKey}
        glowIntensity={glowIntensity}
        isDragging={isDragging}
        isHovering={isHovering}
        isOpen={isOpen}
        loading={loading}
        onBackdropClick={handlePortalClose}
        onCancel={onClose}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onFileChange={handleFileChange}
        onModalClick={handleModalClick}
        onRemoveFile={handleRemoveFile}
        onToggleFullPreview={toggleFullPreview}
        onUpload={handleUpload}
        onUploaderMouseEnter={handleUploaderMouseEnter}
        onUploaderMouseLeave={handleUploaderMouseLeave}
        previewUrl={previewUrl}
        shouldShowGlow={shouldShowGlow}
        uploaderContainerRef={uploaderContainerRef}
      />

      <InvoiceFullPreviewPortal
        imageContainerRef={imageContainerRef}
        onClose={handleFullPreviewClose}
        onMouseMove={handleMouseMove}
        onWheel={handleZoom}
        position={position}
        previewUrl={previewUrl}
        showFullPreview={showFullPreview}
        zoomLevel={zoomLevel}
      />
    </>
  );
};

export default UploadInvoicePortal;
