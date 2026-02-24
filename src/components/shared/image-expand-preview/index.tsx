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
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-opacity duration-150 ${
        isVisible
          ? 'bg-black/70 opacity-100 pointer-events-auto'
          : 'bg-black/70 opacity-0 pointer-events-none'
      } ${backdropClassName}`}
      onClick={onClose}
      role={backdropRole}
      tabIndex={backdropTabIndex}
      aria-label={backdropAriaLabel}
      onKeyDown={onBackdropKeyDown}
    >
      <div
        className={`max-h-[90vh] max-w-[90vw] p-3 transition-all duration-150 ease-out ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        } ${contentClassName}`}
        onClick={event => event.stopPropagation()}
      >
        {isVisible ? children : null}
      </div>
    </div>,
    document.body
  );
};

export default ImageExpandPreview;
