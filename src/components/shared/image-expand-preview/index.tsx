import { createPortal } from 'react-dom';
import type { KeyboardEventHandler, ReactNode } from 'react';

interface ImageExpandPreviewProps {
  isOpen: boolean;
  isVisible: boolean;
  onClose: () => void;
  children: ReactNode;
  backdropClassName?: string;
  contentClassName?: string;
  backdropRole?: string;
  backdropTabIndex?: number;
  backdropAriaLabel?: string;
  onBackdropKeyDown?: KeyboardEventHandler<HTMLDivElement>;
}

const ImageExpandPreview = ({
  isOpen,
  isVisible,
  onClose,
  children,
  backdropClassName = '',
  contentClassName = '',
  backdropRole,
  backdropTabIndex,
  backdropAriaLabel,
  onBackdropKeyDown,
}: ImageExpandPreviewProps) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-opacity duration-200 ${
        isVisible
          ? 'bg-black/70 opacity-100 pointer-events-auto'
          : 'bg-black/70 opacity-0 pointer-events-none'
      } ${backdropClassName}`}
      onClick={onClose}
      role="button"
      tabIndex={0}
      data-backdrop-role={backdropRole}
      data-backdrop-tab-index={backdropTabIndex}
      aria-label={backdropAriaLabel}
      onKeyDown={onBackdropKeyDown}
    >
      <div
        className={`max-h-[90vh] max-w-[90vw] p-3 transform-gpu will-change-transform transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        } ${contentClassName}`}
        onClick={event => event.stopPropagation()}
        role="presentation"
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default ImageExpandPreview;
