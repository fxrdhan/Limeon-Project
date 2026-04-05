import { createPortal } from 'react-dom';
import type { ConfirmDialogContextType, ConfirmDialogOptions } from '@/types';
import React, {
  createContext,
  useState,
  useContext,
  useCallback,
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

const actionButtonStyles = {
  cancel:
    'inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-slate-300',
  danger:
    'inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-hidden focus:ring-2 focus:ring-red-300',
  primary:
    'inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:brightness-95 focus:outline-hidden focus:ring-2 focus:ring-primary/30',
} as const;

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [dialogState, setDialogState] =
    useState<
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
    if (!isOpen) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 50);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen]);

  if (!context || !isOpen) {
    return null;
  }

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

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleCancel();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
      return;
    }

    if (event.key !== 'Tab' || !dialogRef.current) {
      return;
    }

    const focusableElements = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(element => element.offsetParent !== null);

    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
      return;
    }

    if (document.activeElement === lastElement) {
      firstElement.focus();
      event.preventDefault();
    }
  };

  return createPortal(
    <div
      ref={dialogRef}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div id="dialog-title" className="mb-2 text-lg font-semibold">
          {title}
        </div>
        <div className="mb-6 text-slate-600">{message}</div>

        <div className="flex justify-between gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={handleCancel}
            className={actionButtonStyles.cancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={
              variant === 'danger'
                ? actionButtonStyles.danger
                : actionButtonStyles.primary
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
