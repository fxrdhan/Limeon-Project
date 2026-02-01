import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CardFooter } from '@/components/card';
import FormAction from '@/components/form-action';
import type { ReactNode } from 'react';

interface ItemModalTemplateProps {
  isOpen: boolean;
  isClosing: boolean;
  onBackdropClick: () => void;
  onSubmit: (e: React.FormEvent) => void;
  rightColumnProps?: React.HTMLAttributes<HTMLDivElement>;
  children: {
    header: ReactNode;
    basicInfoRequired: ReactNode;
    basicInfoOptional: ReactNode;
    categoryForm?: ReactNode;
    settingsForm: ReactNode;
    pricingForm: ReactNode;
    packageConversionManager: ReactNode;
    modals: ReactNode;
  };
  formAction: {
    onCancel: () => void;
    onDelete?: () => void;
    isSaving: boolean;
    isDeleting: boolean;
    isEditMode: boolean;
    isDisabled: boolean;
  };
}

const ItemModalTemplate: React.FC<ItemModalTemplateProps> = React.memo(
  ({
    isOpen,
    isClosing,
    onBackdropClick,
    onSubmit,
    rightColumnProps,
    children,
    formAction,
  }) => {
    const { className: rightColumnClassName, ...restRightColumnProps } =
      rightColumnProps || {};
    const modalRef = useRef<HTMLDivElement>(null);
    const backdropVariants = {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    };

    const modalVariants = {
      hidden: { scale: 0.95, opacity: 0 },
      visible: { scale: 1, opacity: 1 },
    };

    const contentVariants = {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    };

    useEffect(() => {
      if (!isOpen) return;
      const container = modalRef.current;
      if (!container) return;

      const getFocusableElements = () => {
        const focusableSelector =
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const nodes = Array.from(
          container.querySelectorAll<HTMLElement>(focusableSelector)
        ).filter(node => {
          if (node.tabIndex < 0) return false;
          if (node.hasAttribute('disabled')) return false;
          if (node.getAttribute('aria-hidden') === 'true') return false;
          return node.getClientRects().length > 0;
        });

        const positive = nodes
          .filter(node => node.tabIndex > 0)
          .sort((a, b) => {
            if (a.tabIndex !== b.tabIndex) return a.tabIndex - b.tabIndex;
            return a.compareDocumentPosition(b) &
              Node.DOCUMENT_POSITION_FOLLOWING
              ? -1
              : 1;
          });
        const zero = nodes.filter(node => node.tabIndex === 0);
        return [...positive, ...zero];
      };

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return;
        if (!container.contains(document.activeElement)) return;

        const focusables = getFocusableElements();
        if (focusables.length === 0) return;

        const active = document.activeElement as HTMLElement | null;
        const currentIndex = active ? focusables.indexOf(active) : -1;
        if (event.shiftKey) {
          if (currentIndex <= 0) {
            event.preventDefault();
            focusables[focusables.length - 1]?.focus();
          }
        } else if (
          currentIndex === -1 ||
          currentIndex === focusables.length - 1
        ) {
          event.preventDefault();
          focusables[0]?.focus();
        }
      };

      const focusFirst = () => {
        const focusables = getFocusableElements();
        if (focusables.length === 0) return;
        if (!container.contains(document.activeElement)) {
          focusables[0]?.focus();
        }
      };

      document.addEventListener('keydown', handleKeyDown, true);
      requestAnimationFrame(focusFirst);

      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }, [isOpen]);

    return createPortal(
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="modal-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate={isClosing ? 'exit' : 'visible'}
            exit="exit"
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-label="Item modal"
            onClick={e => {
              if (e.target === e.currentTarget && !isClosing) {
                onBackdropClick();
              }
            }}
          >
            <motion.div
              key="modal-content"
              variants={modalVariants}
              initial="hidden"
              animate={isClosing ? 'exit' : 'visible'}
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="rounded-2xl bg-white shadow-xl w-[60vw] max-h-[90vh] md:h-[90vh] flex flex-col border border-slate-200"
              onClick={e => e.stopPropagation()}
              ref={modalRef}
            >
              <motion.div
                key="modal-header"
                variants={contentVariants}
                initial="hidden"
                animate={isClosing ? 'exit' : 'visible'}
                exit="exit"
                transition={{ duration: 0.2, delay: 0.05 }}
              >
                {children.header}
              </motion.div>

              <motion.form
                key="modal-form"
                variants={contentVariants}
                initial="hidden"
                animate={isClosing ? 'exit' : 'visible'}
                exit="exit"
                transition={{ duration: 0.2, delay: 0.1 }}
                onSubmit={onSubmit}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden scrollbar-hide">
                  <div className="px-6 py-2 h-full min-h-0 flex flex-col">
                    {/* Detect if this is a full-width layout (only basicInfo, others are null) */}
                    {!children.settingsForm &&
                    !children.pricingForm &&
                    !children.packageConversionManager ? (
                      // Full-width layout for history mode
                      <div className="w-full flex-1 min-h-0 overflow-y-auto scrollbar-hide">
                        {children.basicInfoRequired}
                        {children.basicInfoOptional}
                        {children.categoryForm && children.categoryForm}
                      </div>
                    ) : (
                      // Standard form layout
                      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-5">
                        <div className="w-full md:w-[40%] min-h-0 md:overflow-y-auto md:pr-2 md:pl-2 scrollbar-hide">
                          {children.basicInfoRequired}
                          {children.categoryForm && children.categoryForm}
                        </div>

                        <div
                          className={`w-full md:w-[60%] flex flex-col gap-0 min-h-0 md:overflow-y-auto md:pl-2 md:pr-2 scrollbar-hide ${rightColumnClassName || ''}`}
                          {...restRightColumnProps}
                        >
                          {children.basicInfoOptional}
                          {children.settingsForm}
                          {children.pricingForm}
                          {children.packageConversionManager}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <CardFooter className="sticky bottom-0 z-10 py-6! px-6! border-t border-slate-200 bg-white">
                  <FormAction
                    onCancel={formAction.onCancel}
                    onDelete={formAction.onDelete}
                    isSaving={formAction.isSaving}
                    isDeleting={formAction.isDeleting}
                    isEditMode={formAction.isEditMode}
                    cancelTabIndex={29}
                    saveTabIndex={30}
                    isDisabled={formAction.isDisabled}
                    saveText="Simpan"
                    updateText="Update"
                    deleteText="Hapus"
                  />
                </CardFooter>
              </motion.form>

              {children.modals}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    );
  }
);

ItemModalTemplate.displayName = 'ItemModalTemplate';

export default ItemModalTemplate;
