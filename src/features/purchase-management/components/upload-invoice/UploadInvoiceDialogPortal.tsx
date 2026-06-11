import {
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
  type RefObject,
  type TouchEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/card';
import { AnimatePresence, motion } from 'motion/react';
import { InvoiceDropZone } from './InvoiceDropZone';
import { SelectedInvoiceFilePreview } from './SelectedInvoiceFilePreview';
import { UploadInvoiceActions } from './UploadInvoiceActions';
import { UploadInvoiceErrorAlert } from './UploadInvoiceErrorAlert';

interface UploadInvoiceDialogPortalProps {
  error: string | null;
  file: File | null;
  fileInputKey: number;
  glowIntensity: number;
  isDragging: boolean;
  isHovering: boolean;
  isOpen: boolean;
  loading: boolean;
  onBackdropClick: () => void;
  onCancel: () => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onModalClick: (event: MouseEvent<HTMLDivElement>) => void;
  onRemoveFile: (event?: MouseEvent | TouchEvent) => void;
  onToggleFullPreview: () => void;
  onUpload: () => void;
  onUploaderMouseEnter: () => void;
  onUploaderMouseLeave: (event: MouseEvent<HTMLDivElement>) => void;
  previewUrl: string | null;
  shouldShowGlow: boolean;
  uploaderContainerRef: RefObject<HTMLDivElement | null>;
}

export const UploadInvoiceDialogPortal = ({
  error,
  file,
  fileInputKey,
  glowIntensity,
  isDragging,
  isHovering,
  isOpen,
  loading,
  onBackdropClick,
  onCancel,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileChange,
  onModalClick,
  onRemoveFile,
  onToggleFullPreview,
  onUpload,
  onUploaderMouseEnter,
  onUploaderMouseLeave,
  previewUrl,
  shouldShowGlow,
  uploaderContainerRef,
}: UploadInvoiceDialogPortalProps) => {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs"
          onClick={onBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={onModalClick}
          >
            <Card className="m-6 w-[600px] max-w-[90vw] !bg-white shadow-lg">
              <CardHeader className="mb-4 rounded-t-xl border-b-2 border-slate-200 bg-white pb-2">
                <CardTitle className="text-xl font-semibold text-slate-800 !bg-white">
                  Unggah Faktur Pembelian
                </CardTitle>
              </CardHeader>
              <CardContent className="min-h-[200px] pt-6">
                <AnimatePresence>
                  {error ? <UploadInvoiceErrorAlert error={error} /> : null}
                </AnimatePresence>
                <div className="w-full space-y-6">
                  {!file ? (
                    <InvoiceDropZone
                      fileInputKey={fileInputKey}
                      glowIntensity={glowIntensity}
                      isDragging={isDragging}
                      isHovering={isHovering}
                      onClick={() =>
                        document.getElementById('fileInput')?.click()
                      }
                      onDragLeave={onDragLeave}
                      onDragOver={onDragOver}
                      onDrop={onDrop}
                      onFileChange={onFileChange}
                      onMouseEnter={onUploaderMouseEnter}
                      onMouseLeave={onUploaderMouseLeave}
                      shouldShowGlow={shouldShowGlow}
                      uploaderContainerRef={uploaderContainerRef}
                    />
                  ) : (
                    <SelectedInvoiceFilePreview
                      file={file}
                      fileInputKey={fileInputKey}
                      onFileChange={onFileChange}
                      onRemoveFile={onRemoveFile}
                      onToggleFullPreview={onToggleFullPreview}
                      previewUrl={previewUrl}
                    />
                  )}
                  <UploadInvoiceActions
                    file={file}
                    loading={loading}
                    onCancel={onCancel}
                    onUpload={onUpload}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
