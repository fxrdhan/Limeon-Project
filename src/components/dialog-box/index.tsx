import Button from '@/components/button';
import { createPortal } from 'react-dom';
import { Transition, TransitionChild } from '@headlessui/react';
import type { ConfirmDialogContextType, ConfirmDialogOptions } from '@/types';
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  Fragment,
  useRef,
  useEffect,
} from 'react';

const initialState: Omit<
  ConfirmDialogContextType,
  'openConfirmDialog' | 'closeConfirmDialog'
> = {
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Ya',
  cancelText: 'Batal',
  onConfirm: () => {},
  onCancel: () => {},
  variant: 'primary',
};

const ConfirmDialogContext = createContext<
  ConfirmDialogContextType | undefined
>(undefined);

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [dialogState, setDialogState] = useState<
    Omit<ConfirmDialogContextType, 'openConfirmDialog' | 'closeConfirmDialog'>
  >(initialState);

  const openConfirmDialog = useCallback((options: ConfirmDialogOptions) => {
    setDialogState({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || 'Ya',
      cancelText: options.cancelText || 'Batal',
      onConfirm: options.onConfirm,
      onCancel: options.onCancel || (() => {}),
      variant: options.variant || 'primary',
    });
  }, []);

  const closeConfirmDialog = useCallback(() => {
    setDialogState(state => ({
      ...state,
      isOpen: false,
    }));
  }, []);

  return (
    <ConfirmDialogContext.Provider
      value={{
        ...dialogState,
        openConfirmDialog,
        closeConfirmDialog,
      }}
    >
      {children}
      <ConfirmDialogComponent />
    </ConfirmDialogContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useConfirmDialog = () => {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error(
      'useConfirmDialog must be used within a ConfirmDialogProvider'
    );
  }
  return context;
};

export const ConfirmDialogComponent: React.FC = () => {
  const context = useContext(ConfirmDialogContext);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const isOpen = context?.isOpen ?? false;

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => cancelButtonRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!context) return null;

  const {
    title,
    message,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    variant,
    closeConfirmDialog,
  } = context;

  const handleConfirm = () => {
    onConfirm();
    closeConfirmDialog();
  };

  const handleCancel = () => {
    onCancel();
    closeConfirmDialog();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Tab') {
      if (!dialogRef.current) return;

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter(el => el.offsetParent !== null);

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    }
  };

  return createPortal(
    <Transition show={isOpen} as={Fragment}>
      <div
        ref={dialogRef}
        onKeyDown={handleKeyDown}
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <TransitionChild
          as={Fragment}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            aria-hidden="true"
          />
        </TransitionChild>

        <TransitionChild
          as={Fragment}
          enter="transition-all duration-300 ease-out"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="transition-all duration-200 ease-in"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div id="dialog-title" className="text-lg font-semibold mb-2">
              {title}
            </div>
            <div className="text-slate-600 mb-6">{message}</div>

            <div className="flex justify-between">
              <div>
                <Button
                  type="button"
                  variant="text"
                  onClick={handleCancel}
                  ref={cancelButtonRef}
                >
                  {cancelText}
                </Button>
              </div>
              <div>
                <Button type="button" variant={variant} onClick={handleConfirm}>
                  {confirmText}
                </Button>
              </div>
            </div>
          </div>
        </TransitionChild>
      </div>
    </Transition>,
    document.body
  );
};
