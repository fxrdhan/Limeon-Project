import { createPortal } from 'react-dom';
import type { ConfirmDialogOptions } from '@/types';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ConfirmDialogContext,
  initialConfirmDialogState,
  type ConfirmDialogState,
} from './context';

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
  const [dialogState, setDialogState] = useState<ConfirmDialogState>(
    initialConfirmDialogState
  );

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

export const ConfirmDialogComponent: React.FC = () => {
  const context = React.useContext(ConfirmDialogContext);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const isOpen = context?.isOpen ?? false;

  const handleCancel = useCallback(() => {
    if (!context) {
      return;
    }
    context.onCancel();
    context.closeConfirmDialog();
  }, [context]);

  const handleConfirm = useCallback(() => {
    if (!context) {
      return;
    }
    context.onConfirm();
    context.closeConfirmDialog();
  }, [context]);

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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
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

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleCancel, isOpen]);

  if (!context || !isOpen) {
    return null;
  }

  const { title, message, confirmText, cancelText, variant } = context;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs">
      <button
        type="button"
        aria-label="Tutup dialog"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default border-0 bg-transparent p-0"
        onClick={handleCancel}
      />
      <div
        ref={dialogRef}
        className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
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
