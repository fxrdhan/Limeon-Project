import React from 'react';
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
  children: {
    header: ReactNode;
    basicInfo: ReactNode;
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
  ({ isOpen, isClosing, onBackdropClick, onSubmit, children, formAction }) => {
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
              className="rounded-xl bg-white shadow-xl w-[75vw] max-h-[90vh] flex flex-col"
              onClick={e => e.stopPropagation()}
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
                <div className="flex-1 overflow-y-auto">
                  <div className="px-6 py-1">
                    {/* Detect if this is a full-width layout (only basicInfo, others are null) */}
                    {!children.settingsForm &&
                    !children.pricingForm &&
                    !children.packageConversionManager ? (
                      // Full-width layout for history mode
                      <div className="w-full">
                        {children.basicInfo}
                        {children.categoryForm && children.categoryForm}
                      </div>
                    ) : (
                      // Standard form layout
                      <>
                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="w-full md:w-4/5">
                            {children.basicInfo}
                            {children.categoryForm && children.categoryForm}
                          </div>

                          <div className="w-full md:w-1/4">
                            {children.settingsForm}
                          </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6">
                          <div className="w-full md:w-1/4">
                            {children.pricingForm}
                          </div>

                          <div className="w-full md:w-3/4">
                            {children.packageConversionManager}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <CardFooter className="sticky bottom-0 z-10 py-6! px-6!">
                  <FormAction
                    onCancel={formAction.onCancel}
                    onDelete={formAction.onDelete}
                    isSaving={formAction.isSaving}
                    isDeleting={formAction.isDeleting}
                    isEditMode={formAction.isEditMode}
                    cancelTabIndex={20}
                    saveTabIndex={21}
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
