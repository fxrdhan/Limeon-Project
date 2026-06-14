import type {
  ChangeEvent,
  MouseEvent as ReactMouseEvent,
  TouchEvent,
} from 'react';
import { TbPhoto, TbX } from 'react-icons/tb';
import { motion } from 'motion/react';
import {
  formatInvoiceFileSize,
  getSafeImageUrl,
} from '../../domain/uploadInvoiceUtils';

interface SelectedInvoiceFilePreviewProps {
  file: File;
  fileInputKey: number;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (event?: ReactMouseEvent | TouchEvent) => void;
  onToggleFullPreview: () => void;
  previewUrl: string | null;
}

export function SelectedInvoiceFilePreview({
  file,
  fileInputKey,
  onFileChange,
  onRemoveFile,
  onToggleFullPreview,
  previewUrl,
}: SelectedInvoiceFilePreviewProps) {
  const safeUrl = getSafeImageUrl(previewUrl);

  return (
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
        className="flex items-center p-3 pr-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
        onClick={event => {
          const target = event.target as HTMLElement;
          const isRemoveButton = target.closest('[aria-label="Hapus file"]');
          if (!isRemoveButton) {
            event.stopPropagation();
            onToggleFullPreview();
          }
        }}
        onTouchEnd={event => {
          const target = event.target as HTMLElement;
          const isRemoveButton = target.closest('[aria-label="Hapus file"]');
          if (!isRemoveButton) {
            event.preventDefault();
            event.stopPropagation();
            onToggleFullPreview();
          }
        }}
      >
        {safeUrl ? (
          <div className="h-16 w-16 mr-3 overflow-hidden rounded-xl border border-slate-200 shrink-0">
            <img
              src={safeUrl}
              alt="Thumbnail"
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="h-16 w-16 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
            <TbPhoto className="h-8 w-8 text-slate-400" />
          </div>
        )}
        <div className="text-left grow">
          <p className="text-sm font-medium text-slate-700 truncate">
            {file.name}
          </p>
          <p className="text-xs text-slate-500">
            {formatInvoiceFileSize(file)} • Klik untuk pratinjau
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={event => {
            event.preventDefault();
            event.stopPropagation();
            onRemoveFile(event);
          }}
          onMouseDown={event => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onTouchStart={event => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onTouchEnd={event => {
            event.preventDefault();
            event.stopPropagation();
            onRemoveFile(event);
          }}
          className="hover:text-red-600 hover:bg-red-50 text-slate-500 cursor-pointer relative z-30 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-xl transition-all duration-200 -mr-2"
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
        aria-label="Unggah gambar faktur"
        onChange={onFileChange}
        className="hidden"
      />
    </motion.div>
  );
}
