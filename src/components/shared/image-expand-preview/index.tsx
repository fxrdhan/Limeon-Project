import { createPortal } from 'react-dom';
import type { KeyboardEventHandler, ReactNode } from 'react';

interface ImageExpandPreviewProps {
  isOpen: boolean;
  isVisible: boolean;
  onClose: () => void;
  children: ReactNode;
  animateScale?: boolean;
  closeOnContentBackgroundClick?: boolean;
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
  animateScale = true,
  closeOnContentBackgroundClick = false,
  backdropClassName = '',
  contentClassName = '',
  backdropRole = 'button',
  backdropTabIndex = 0,
  backdropAriaLabel = 'Tutup preview',
  onBackdropKeyDown,
}: ImageExpandPreviewProps) => {
  if (!isOpen) return null;

  const backdropProps = {
    onClick: onClose,
    role: backdropRole,
    tabIndex: backdropTabIndex,
    'aria-label': backdropAriaLabel,
    onKeyDown: onBackdropKeyDown,
  };

  return createPortal(
    <div
      {...backdropProps}
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-opacity duration-200 ${
        isVisible
          ? 'bg-black/70 opacity-100 pointer-events-auto'
          : 'bg-black/70 opacity-0 pointer-events-none'
      } ${backdropClassName}`}
    >
      <div
        className={`max-h-[90vh] max-w-[90vw] p-3 transform-gpu will-change-transform transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isVisible ? 'opacity-100' : 'opacity-0'
        } ${
          animateScale ? (isVisible ? 'scale-100' : 'scale-90') : 'scale-100'
        } ${contentClassName}`}
        onClick={event => {
          if (
            closeOnContentBackgroundClick &&
            event.target === event.currentTarget
          ) {
            onClose();
            return;
          }

          event.stopPropagation();
        }}
        role="presentation"
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default ImageExpandPreview;
