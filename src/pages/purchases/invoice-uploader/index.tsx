import Button from '@/components/button';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/card';
import { TbPhoto, TbUpload, TbX, TbZoomIn, TbZoomOut } from 'react-icons/tb';
import { uploadAndExtractInvoice } from '@/services/invoiceExtractor';
import { useInvoiceUploadStore } from '@/store/invoiceUploadStore';
import { motion, AnimatePresence } from 'motion/react';

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

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const glowAnimationRef = useRef<NodeJS.Timeout | null>(null);

  const imageContainerRef = useRef<HTMLDivElement>(null);
  const uploaderContainerRef = useRef<HTMLDivElement>(null);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getGlowEffect = (intensity: number) => {
    const baseIntensity = 0.4 + intensity * 0.5;
    const outerIntensity = 0.25 + intensity * 0.4;
    return `0 0 ${12 + intensity * 12}px rgba(16, 185, 129, ${baseIntensity}), 0 0 ${25 + intensity * 25}px rgba(16, 185, 129, ${outerIntensity})`;
  };

  // Helper function to safely get blob URL for image src to prevent XSS
  // Using URL constructor for validation that CodeQL recognizes
  const getSafeImageUrl = (url: string | null): string | undefined => {
    if (!url) return undefined;
    try {
      // Parse URL to validate structure
      const parsed = new URL(url);
      // Only allow blob protocol to prevent XSS
      if (parsed.protocol === 'blob:') {
        // Return the validated href (sanitized by URL constructor)
        return parsed.href;
      }
    } catch {
      // Invalid URL, return undefined
      return undefined;
    }
    return undefined;
  };

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
    const hoverTimeout = hoverTimeoutRef.current;
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
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
      if (glowTimeout) {
        clearTimeout(glowTimeout);
      }
    }

    return () => {
      if (hoverTimeout) {
        clearTimeout(hoverTimeout);
      }
      if (glowTimeout) {
        clearTimeout(glowTimeout);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (throttleTimeoutRef.current) return;

      mousePositionRef.current = { x: e.clientX, y: e.clientY };

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

      const handlePortalMouseMove = (e: MouseEvent) => {
        mousePositionRef.current = { x: e.clientX, y: e.clientY };
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

      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);
    if (!selectedFile) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Tipe file tidak valid. Harap unggah file PNG atau JPG.');
      setFile(null);
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError('Ukuran file terlalu besar. Maksimum 5MB.');
      setFile(null);
      return;
    }
    setFile(selectedFile);
    setCachedInvoiceFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(droppedFile.type)) {
      setError('Tipe file tidak valid. Harap unggah file PNG atau JPG.');
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (droppedFile.size > maxSize) {
      setError('Ukuran file terlalu besar. Maksimum 5MB.');
      return;
    }
    setFile(droppedFile);
    setCachedInvoiceFile(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Silakan pilih file gambar faktur terlebih dahulu.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const startTime = Date.now();
      const data = await uploadAndExtractInvoice(file);
      const imageIdentifier = data.imageIdentifier;
      const processingTime = (Date.now() - startTime) / 1000;
      clearCachedInvoiceFile();
      onClose();
      navigate('/purchases/confirm-invoice', {
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

  const handleRemoveFile = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
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

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
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

  const toggleFullPreview = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!showFullPreview) {
      setShowFullPreview(true);
    } else {
      setShowFullPreview(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setPosition({ x, y });
  };

  const handleZoom = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomIncrement = 0.1;
    const direction = e.deltaY > 0 ? 1 : -1;
    setZoomLevel(currentZoom => {
      const newZoom = currentZoom + direction * zoomIncrement;
      return Math.min(Math.max(newZoom, 1), 3);
    });
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <>
      {createPortal(
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => {
                if (showFullPreview) {
                  setShowFullPreview(false);
                }

                setIsHovering(false);
                setShouldShowGlow(false);
                setGlowIntensity(0);
                setIsDragging(false);

                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current);
                  hoverTimeoutRef.current = null;
                }
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
              }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 30, rotateX: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 10, rotateX: -5 }}
                transition={{
                  duration: 0.2,
                  type: 'spring',
                  damping: 35,
                  stiffness: 400,
                  ease: 'easeOut',
                }}
                style={{
                  perspective: '1000px',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  willChange: 'transform, opacity',
                }}
                onClick={e => {
                  e.stopPropagation();
                  if (!file && uploaderContainerRef.current) {
                    const rect =
                      uploaderContainerRef.current.getBoundingClientRect();
                    const mouseX = e.clientX;
                    const mouseY = e.clientY;

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
                }}
              >
                <Card className="shadow-lg w-[600px] max-w-[90vw] m-6 !bg-white">
                  <CardHeader className="mb-4 bg-white rounded-t-xl pb-2 border-b-2 border-slate-200">
                    <CardTitle className="text-xl !bg-white font-semibold text-slate-800">
                      Unggah Faktur Pembelian
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 min-h-[200px]">
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-sm mb-4 flex items-center"
                        >
                          <motion.svg
                            initial={{ rotate: 0 }}
                            animate={{ rotate: [0, 10, -10, 0] }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="h-5 w-5 mr-2 text-red-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 101.414 1.414L10 11.414l1.293 1.293a1 1 001.414-1.414L11.414 10l1.293-1.293a1 1 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </motion.svg>
                          {error}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="space-y-6 w-full">
                      {!file ? (
                        <motion.div
                          ref={uploaderContainerRef}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            boxShadow: shouldShowGlow
                              ? getGlowEffect(glowIntensity)
                              : 'none',
                          }}
                          transition={{
                            delay: 0.1,
                            duration: 0.4,
                            ease: 'easeOut',
                            boxShadow: {
                              duration: 0.15,
                              ease: 'easeOut',
                            },
                          }}
                          className={`border-2 ${
                            isDragging
                              ? 'border-primary bg-emerald-50'
                              : isHovering
                                ? 'border-dashed border-primary bg-emerald-25'
                                : 'border-dashed border-slate-300'
                          }
                                                  rounded-xl p-10 text-center cursor-pointer w-full min-h-[160px] flex items-center justify-center`}
                          style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'translateZ(0)',
                            WebkitTransform: 'translateZ(0)',
                            willChange:
                              'transform, opacity, border-color, background-color',
                            WebkitFontSmoothing: 'antialiased',
                            MozOsxFontSmoothing: 'grayscale',
                            contain: 'layout style paint',
                            isolation: 'isolate',
                            backgroundColor: isHovering
                              ? 'rgba(240, 253, 250, 0.5)'
                              : 'transparent',
                            borderColor: isHovering
                              ? 'rgb(20, 184, 166)'
                              : isDragging
                                ? 'rgb(20, 184, 166)'
                                : 'rgb(209, 213, 219)',
                            transition:
                              'border-color 200ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onMouseEnter={() => {
                            if (!isHovering) {
                              setIsHovering(true);
                              if (hoverTimeoutRef.current) {
                                clearTimeout(hoverTimeoutRef.current);
                              }
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
                                  glowAnimationRef.current = setTimeout(
                                    animateGlow,
                                    3
                                  );
                                }
                              };
                              requestAnimationFrame(animateGlow);
                            }
                          }}
                          onMouseLeave={e => {
                            const rect =
                              uploaderContainerRef.current?.getBoundingClientRect();
                            if (rect) {
                              const isStillInside =
                                e.clientX >= rect.left &&
                                e.clientX <= rect.right &&
                                e.clientY >= rect.top &&
                                e.clientY <= rect.bottom;

                              if (!isStillInside) {
                                setIsHovering(false);
                                if (hoverTimeoutRef.current) {
                                  clearTimeout(hoverTimeoutRef.current);
                                }
                                if (glowAnimationRef.current) {
                                  clearTimeout(glowAnimationRef.current);
                                }

                                let currentIntensity = glowIntensity;
                                const fadeGlow = () => {
                                  currentIntensity -= 0.4;
                                  if (currentIntensity > 0) {
                                    setGlowIntensity(currentIntensity);
                                    glowAnimationRef.current = setTimeout(
                                      fadeGlow,
                                      2
                                    );
                                  } else {
                                    setGlowIntensity(0);
                                    setShouldShowGlow(false);
                                  }
                                };
                                requestAnimationFrame(fadeGlow);
                              }
                            }
                          }}
                          onClick={() =>
                            document.getElementById('fileInput')?.click()
                          }
                        >
                          <div className="flex flex-col items-center">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className={`rounded-full ${isHovering ? 'bg-emerald-100' : 'bg-slate-200'} p-4 inline-flex mb-3 transition-all duration-300 ease-out outline-none focus:outline-none border-0 ring-0 focus:ring-0`}
                              style={{
                                backfaceVisibility: 'hidden',
                                WebkitBackfaceVisibility: 'hidden',
                                transform: 'translateZ(0)',
                                WebkitTransform: 'translateZ(0)',
                                willChange: 'transform',
                                isolation: 'isolate',
                                WebkitFontSmoothing: 'antialiased',
                                MozOsxFontSmoothing: 'grayscale',
                              }}
                            >
                              <motion.div
                                animate={isHovering ? { y: [-2, 2, -2] } : {}}
                                transition={
                                  isHovering
                                    ? {
                                        duration: 2.0,
                                        repeat: Infinity,
                                        ease: 'easeInOut',
                                      }
                                    : {}
                                }
                              >
                                <TbUpload
                                  className={`mx-auto h-8 w-8 ${isHovering ? 'text-primary' : 'text-slate-600'} transition-all duration-300 ease-out`}
                                />
                              </motion.div>
                            </motion.div>
                            <p
                              className={`text-sm font-medium transition-colors duration-300 ease-out ${isHovering ? 'text-primary' : 'text-slate-700'}`}
                            >
                              Klik atau seret untuk mengunggah gambar faktur
                            </p>
                            <p
                              className={`text-xs mt-1 transition-colors duration-300 ease-out ${isHovering ? 'text-primary/70' : 'text-slate-500'}`}
                            >
                              PNG, JPG (Maks. 5MB)
                            </p>
                          </div>
                          <input
                            id="fileInput"
                            type="file"
                            key={fileInputKey}
                            accept="image/png,image/jpeg,image/jpg"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          transition={{
                            duration: 0.4,
                            type: 'spring',
                            damping: 25,
                            stiffness: 400,
                          }}
                          className="mb-4 w-full"
                        >
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center p-3 pr-4 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                            onClick={e => {
                              const target = e.target as HTMLElement;
                              const isRemoveButton = target.closest(
                                '[aria-label="Hapus file"]'
                              );
                              if (!isRemoveButton) {
                                e.stopPropagation();
                                toggleFullPreview();
                              }
                            }}
                            onTouchEnd={e => {
                              const target = e.target as HTMLElement;
                              const isRemoveButton = target.closest(
                                '[aria-label="Hapus file"]'
                              );
                              if (!isRemoveButton) {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleFullPreview();
                              }
                            }}
                          >
                            {(() => {
                              const safeUrl = getSafeImageUrl(previewUrl);
                              return safeUrl ? (
                                <div className="h-16 w-16 mr-3 overflow-hidden rounded-md border border-slate-200 shrink-0">
                                  <img
                                    src={safeUrl}
                                    alt="Thumbnail"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="h-16 w-16 rounded-md bg-slate-200 flex items-center justify-center shrink-0">
                                  <TbPhoto className="h-8 w-8 text-slate-400" />
                                </div>
                              );
                            })()}
                            <div className="text-left grow">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB •
                                Klik untuk pratinjau
                              </p>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveFile(e);
                              }}
                              onMouseDown={e => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onTouchStart={e => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onTouchEnd={e => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveFile(e);
                              }}
                              className="hover:text-red-600 hover:bg-red-50 text-slate-500 cursor-pointer relative z-30 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full transition-all duration-200 -mr-2"
                              aria-label="Hapus file"
                              type="button"
                              title="Hapus file"
                            >
                              <TbX className="h-5 w-5 pointer-events-none" />
                            </motion.button>
                          </motion.div>
                          <input
                            id="fileInput"
                            type="file"
                            key={fileInputKey}
                            accept="image/png,image/jpeg,image/jpg"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </motion.div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                        className="border-t-2 border-slate-200"
                      >
                        <div className="flex justify-between mt-4">
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button
                              type="button"
                              variant="text"
                              onClick={onClose}
                            >
                              Batal
                            </Button>
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button
                              type="button"
                              onClick={handleUpload}
                              disabled={!file || loading}
                              isLoading={loading}
                              className="bg-primary text-white"
                              aria-live="polite"
                              withGlow
                            >
                              <motion.div
                                animate={loading ? { rotate: 360 } : {}}
                                transition={
                                  loading
                                    ? {
                                        duration: 1,
                                        repeat: Infinity,
                                        ease: 'linear',
                                      }
                                    : {}
                                }
                              >
                                <TbUpload className="mr-2" />
                              </motion.div>
                              Ekspor Data
                            </Button>
                          </motion.div>
                        </div>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence mode="wait">
          {showFullPreview && previewUrl && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
              exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
              transition={{ duration: 0.15, ease: 'easeInOut' }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
              onClick={() => {
                setShowFullPreview(false);
                resetZoom();
                setIsHovering(false);
                setShouldShowGlow(false);
                setGlowIntensity(0);

                if (hoverTimeoutRef.current) {
                  clearTimeout(hoverTimeoutRef.current);
                  hoverTimeoutRef.current = null;
                }
                if (glowAnimationRef.current) {
                  clearTimeout(glowAnimationRef.current);
                  glowAnimationRef.current = null;
                }
              }}
            >
              <motion.div
                ref={imageContainerRef}
                initial={{ scale: 0.7, opacity: 0, rotateY: 15 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                exit={{ scale: 0.9, opacity: 0, rotateY: -8 }}
                transition={{
                  duration: 0.15,
                  type: 'spring',
                  damping: 30,
                  stiffness: 450,
                }}
                className="p-4 relative overflow-hidden"
                style={{
                  maxHeight: '100vh',
                  maxWidth: '100vw',
                  width: 'auto',
                  perspective: '1000px',
                }}
                onWheel={handleZoom}
                onMouseMove={handleMouseMove}
              >
                {(() => {
                  const safePreviewUrl = getSafeImageUrl(previewUrl);
                  return safePreviewUrl ? (
                    <img
                      src={safePreviewUrl}
                      alt="Preview"
                      className="h-auto w-auto object-contain transition-transform duration-100"
                      style={{
                        maxHeight: '90vh',
                        maxWidth: '120%',
                        transformOrigin: `${position.x}px ${position.y}px`,
                        transform: `scale(${zoomLevel})`,
                      }}
                    />
                  ) : null;
                })()}
                <motion.div
                  initial={{ y: 30, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 20, opacity: 0, scale: 0.9 }}
                  transition={{
                    delay: 0.1,
                    duration: 0.2,
                    type: 'spring',
                    damping: 25,
                    stiffness: 400,
                  }}
                  className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full flex items-center space-x-2"
                >
                  <TbZoomOut className="text-slate-200" />
                  <div className="text-sm font-medium">
                    {Math.round(zoomLevel * 100)}%
                  </div>
                  <TbZoomIn className="text-slate-200" />
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default UploadInvoicePortal;
