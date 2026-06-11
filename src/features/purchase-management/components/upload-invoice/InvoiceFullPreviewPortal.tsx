import type { MouseEvent, RefObject, WheelEvent } from 'react';
import { createPortal } from 'react-dom';
import { TbZoomIn, TbZoomOut } from 'react-icons/tb';
import { AnimatePresence, motion } from 'motion/react';
import { getSafeImageUrl } from './uploadInvoiceUtils';

interface InvoiceFullPreviewPortalProps {
  imageContainerRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onMouseMove: (event: MouseEvent<HTMLDivElement>) => void;
  onWheel: (event: WheelEvent<HTMLDivElement>) => void;
  position: { x: number; y: number };
  previewUrl: string | null;
  showFullPreview: boolean;
  zoomLevel: number;
}

export function InvoiceFullPreviewPortal({
  imageContainerRef,
  onClose,
  onMouseMove,
  onWheel,
  position,
  previewUrl,
  showFullPreview,
  zoomLevel,
}: InvoiceFullPreviewPortalProps) {
  const safePreviewUrl = getSafeImageUrl(previewUrl);

  return createPortal(
    <AnimatePresence>
      {showFullPreview && previewUrl ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            ref={imageContainerRef}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="p-4 relative overflow-hidden"
            style={{
              maxHeight: '100vh',
              maxWidth: '100vw',
              width: 'auto',
              perspective: '1000px',
            }}
            onWheel={onWheel}
            onMouseMove={onMouseMove}
          >
            {safePreviewUrl ? (
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
            ) : null}
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
      ) : null}
    </AnimatePresence>,
    document.body
  );
}
