import type { ChangeEvent, DragEvent, MouseEvent, RefObject } from 'react';
import { TbUpload } from 'react-icons/tb';
import { motion } from 'motion/react';
import { getGlowEffect } from './uploadInvoiceUtils';

interface InvoiceDropZoneProps {
  fileInputKey: number;
  glowIntensity: number;
  isDragging: boolean;
  isHovering: boolean;
  onClick: () => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: (event: MouseEvent<HTMLDivElement>) => void;
  shouldShowGlow: boolean;
  uploaderContainerRef: RefObject<HTMLDivElement | null>;
}

export function InvoiceDropZone({
  fileInputKey,
  glowIntensity,
  isDragging,
  isHovering,
  onClick,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileChange,
  onMouseEnter,
  onMouseLeave,
  shouldShowGlow,
  uploaderContainerRef,
}: InvoiceDropZoneProps) {
  return (
    <motion.div
      ref={uploaderContainerRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{
        opacity: 1,
        y: 0,
        boxShadow: shouldShowGlow ? getGlowEffect(glowIntensity) : 'none',
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
        willChange: 'transform, opacity, border-color, background-color',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        contain: 'layout style paint',
        isolation: 'isolate',
        backgroundColor: isHovering
          ? 'oklch(98.4% 0.014 180.7 / 0.5)'
          : 'transparent',
        borderColor: isHovering
          ? 'oklch(70.4% 0.123 182.5)'
          : isDragging
            ? 'oklch(70.4% 0.123 182.5)'
            : 'oklch(87.2% 0.009 258.3)',
        transition:
          'border-color 200ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <div className="flex flex-col items-center">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className={`rounded-full ${isHovering ? 'bg-primary-light' : 'bg-slate-200'} p-4 inline-flex mb-3 transition-all duration-300 ease-out outline-none focus:outline-none border-0 ring-0 focus:ring-0`}
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
        aria-label="Unggah gambar faktur"
        onChange={onFileChange}
        className="hidden"
      />
    </motion.div>
  );
}
