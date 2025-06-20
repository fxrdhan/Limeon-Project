import Button from "@/components/button";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/card";
import {
  FaUpload,
  FaTimes,
  FaImage,
  FaSearchPlus,
  FaSearchMinus,
} from "react-icons/fa";
import { uploadAndExtractInvoice } from "@/services/invoiceExtractor";
import { useInvoiceUploadStore } from "@/store/invoiceUploadStore";
import { motion, AnimatePresence } from "framer-motion";

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
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const glowShadows = [
    "0 0 15px rgba(16, 185, 129, 0.7), 0 0 30px rgba(16, 185, 129, 0.5), 0 0 45px rgba(16, 185, 129, 0.3)",
    "0 0 20px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.6), 0 0 60px rgba(34, 197, 94, 0.4)",
    "0 0 18px rgba(6, 182, 212, 0.8), 0 0 35px rgba(6, 182, 212, 0.6), 0 0 55px rgba(6, 182, 212, 0.4)",
    "0 0 22px rgba(20, 184, 166, 0.9), 0 0 45px rgba(20, 184, 166, 0.7), 0 0 65px rgba(20, 184, 166, 0.5)",
    "0 0 15px rgba(16, 185, 129, 0.7), 0 0 30px rgba(16, 185, 129, 0.5), 0 0 45px rgba(16, 185, 129, 0.3)",
  ];

  const glowTransition = {
    repeat: Infinity,
    duration: 4,
    ease: "easeInOut" as const,
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
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Restore cached file when portal opens
      if (cachedInvoiceFile) {
        setFile(cachedInvoiceFile);
      }
    } else {
      // Reset local state but not the global cache on close
      setError(null);
      setLoading(false);
      setIsDragging(false);
      setShowFullPreview(false);
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
      setIsHovering(false);
    }
  }, [isOpen, cachedInvoiceFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);
    if (!selectedFile) return;
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Tipe file tidak valid. Harap unggah file PNG atau JPG.");
      setFile(null);
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError("Ukuran file terlalu besar. Maksimum 5MB.");
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
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(droppedFile.type)) {
      setError("Tipe file tidak valid. Harap unggah file PNG atau JPG.");
      return;
    }
    const maxSize = 5 * 1024 * 1024;
    if (droppedFile.size > maxSize) {
      setError("Ukuran file terlalu besar. Maksimum 5MB.");
      return;
    }
    setFile(droppedFile);
    setCachedInvoiceFile(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Silakan pilih file gambar faktur terlebih dahulu.");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const startTime = Date.now();
      const data = await uploadAndExtractInvoice(file);
      const imageIdentifier = data.imageIdentifier;
      const processingTime = (Date.now() - startTime) / 1000;
      clearCachedInvoiceFile(); // Clear cache on successful upload
      onClose();
      navigate("/purchases/confirm-invoice", {
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
          err instanceof Error ? err.message : "Terjadi kesalahan tidak dikenal"
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFile(null);
    setPreviewUrl(null);
    setFileInputKey((prev) => prev + 1);
    setError(null);
    setShowFullPreview(false);
    setIsHovering(false);
    clearCachedInvoiceFile();
  };

  const toggleFullPreview = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setShowFullPreview((prev) => !prev);
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
    setZoomLevel((currentZoom) => {
      const newZoom = currentZoom + direction * zoomIncrement;
      return Math.min(Math.max(newZoom, 1), 3);
    });
  };

  const resetZoom = () => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  return (
    <>
      {createPortal(
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={onClose}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 30, rotateX: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0, rotateX: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20, rotateX: -10 }}
                transition={{
                  duration: 0.4,
                  type: "spring",
                  damping: 20,
                  stiffness: 300,
                }}
                style={{ perspective: "1000px" }}
                onClick={(e) => e.stopPropagation()}
              >
                <Card className="shadow-lg w-[600px] max-w-[90vw] m-6 !bg-white">
                  <CardHeader className="mb-4 bg-white rounded-t-xl pb-2 border-b-2 border-gray-200">
                    <CardTitle className="text-xl !bg-white font-semibold text-gray-800">
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
                          initial={{ opacity: 0, y: 10 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            boxShadow: isHovering ? glowShadows : "none",
                          }}
                          transition={{
                            delay: 0.1,
                            duration: 0.3,
                            boxShadow: isHovering
                              ? glowTransition
                              : { duration: 0.3 },
                          }}
                          className={`border-2 ${
                            isDragging
                              ? "border-primary bg-teal-50"
                              : isHovering
                                ? "border-dashed border-primary"
                                : "border-dashed border-gray-300"
                          }
                                                  rounded-xl p-10 text-center transition-all cursor-pointer hover:bg-gray-50 w-full min-h-[160px] flex items-center justify-center`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onMouseEnter={() => setIsHovering(true)}
                          onMouseLeave={() => setIsHovering(false)}
                          onClick={() =>
                            document.getElementById("fileInput")?.click()
                          }
                        >
                          <div className="flex flex-col items-center">
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.95 }}
                              className={`rounded-full ${isHovering ? "bg-teal-100" : "bg-gray-200"} p-4 inline-flex mb-3 transition-colors duration-500 ease-out outline-none focus:outline-none border-0 ring-0 focus:ring-0`}
                              style={{
                                backfaceVisibility: "hidden",
                                WebkitBackfaceVisibility: "hidden",
                                transform: "translateZ(0)",
                                WebkitTransform: "translateZ(0)",
                                isolation: "isolate",
                                WebkitFontSmoothing: "antialiased",
                                MozOsxFontSmoothing: "grayscale",
                              }}
                            >
                              <motion.div
                                animate={isHovering ? { y: [-2, 2, -2] } : {}}
                                transition={
                                  isHovering
                                    ? { duration: 1.5, repeat: Infinity }
                                    : {}
                                }
                              >
                                <FaUpload
                                  className={`mx-auto h-8 w-8 ${isHovering ? "text-teal-600" : "text-gray-600"} transition-colors duration-500 ease-out`}
                                />
                              </motion.div>
                            </motion.div>
                            <p className="text-sm font-medium text-gray-700">
                              Klik atau seret untuk mengunggah gambar faktur
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
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
                            type: "spring",
                            damping: 25,
                            stiffness: 400,
                          }}
                          className="mb-4 w-full"
                        >
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center p-3 pr-4 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFullPreview();
                            }}
                          >
                            {previewUrl ? (
                              <div className="h-16 w-16 mr-3 overflow-hidden rounded-md border border-gray-200 shrink-0">
                                <img
                                  src={previewUrl}
                                  alt="Thumbnail"
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-16 w-16 rounded-md bg-gray-200 flex items-center justify-center shrink-0">
                                <FaImage className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                            <div className="text-left grow">
                              <p className="text-sm font-medium text-gray-700 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {(file.size / (1024 * 1024)).toFixed(2)} MB •
                                Klik untuk pratinjau
                              </p>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFile(e);
                              }}
                              className="hover:text-black pl-8 text-gray-500 cursor-pointer relative z-30"
                              aria-label="Hapus file"
                            >
                              <FaTimes className="h-4 w-4" />
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
                        className="border-t-2 border-gray-200"
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
                            >
                              <motion.div
                                animate={loading ? { rotate: 360 } : {}}
                                transition={
                                  loading
                                    ? {
                                        duration: 1,
                                        repeat: Infinity,
                                        ease: "linear",
                                      }
                                    : {}
                                }
                              >
                                <FaUpload className="mr-2" />
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
        document.body,
      )}

      {showFullPreview &&
        previewUrl &&
        createPortal(
          <AnimatePresence mode="wait">
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
              onClick={() => {
                toggleFullPreview();
                resetZoom();
              }}
            >
              <motion.div
                ref={imageContainerRef}
                initial={{ scale: 0.7, opacity: 0, rotateY: 15 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                exit={{ scale: 0.8, opacity: 0, rotateY: -15 }}
                transition={{
                  duration: 0.4,
                  type: "spring",
                  damping: 18,
                  stiffness: 300,
                }}
                className="p-4 relative overflow-hidden"
                style={{
                  maxHeight: "100vh",
                  maxWidth: "100vw",
                  width: "auto",
                  perspective: "1000px",
                }}
                onWheel={handleZoom}
                onMouseMove={handleMouseMove}
              >
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="h-auto w-auto object-contain transition-transform duration-100"
                  style={{
                    maxHeight: "90vh",
                    maxWidth: "120%",
                    transformOrigin: `${position.x}px ${position.y}px`,
                    transform: `scale(${zoomLevel})`,
                  }}
                />
                <motion.div
                  initial={{ y: 30, opacity: 0, scale: 0.8 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 20, opacity: 0, scale: 0.9 }}
                  transition={{
                    delay: 0.3,
                    duration: 0.4,
                    type: "spring",
                    damping: 20,
                    stiffness: 300,
                  }}
                  className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-full flex items-center space-x-2"
                >
                  <FaSearchMinus className="text-gray-200" />
                  <div className="text-sm font-medium">
                    {Math.round(zoomLevel * 100)}%
                  </div>
                  <FaSearchPlus className="text-gray-200" />
                </motion.div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};

export default UploadInvoicePortal;
