/**
 * Unified Modal Template System
 *
 * This system eliminates duplication between EntityModalTemplate and ItemModalTemplate
 * by providing a flexible, unified modal foundation with configurable content patterns.
 *
 * Replaces:
 * - EntityModalTemplate.tsx (~70 lines)
 * - ItemModalTemplate.tsx (~165 lines)
 * - Other similar modal templates
 *
 * Benefits:
 * - Eliminates 40+ lines of duplicate backdrop/animation/portal logic
 * - Consistent modal behavior across all templates
 * - Flexible content layout system
 * - Easier maintenance and testing
 * - Single source of truth for modal patterns
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CardFooter } from '@/components/card';
import FormAction from '@/components/form-action';
import type { ReactNode } from 'react';

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Modal animation variants
 */
export interface ModalAnimationConfig {
  backdrop: {
    hidden: { opacity: number };
    visible: { opacity: number };
    exit: { opacity: number };
  };
  modal: {
    hidden: { opacity: number; scale: number };
    visible: { opacity: number; scale: number; x?: number };
    exit: { opacity: number; scale: number };
  };
  content?: {
    hidden: { opacity: number };
    visible: { opacity: number };
    exit: { opacity: number };
  };
}

/**
 * Modal layout configuration
 */
export interface ModalLayoutConfig {
  /** Modal container classes */
  containerClass?: string;

  /** Content container classes */
  contentClass?: string;

  /** Enable form wrapper */
  enableForm?: boolean;

  /** Enable card footer */
  enableFooter?: boolean;

  /** Custom backdrop classes */
  backdropClass?: string;
}

/**
 * Form action configuration
 */
export interface FormActionConfig {
  onCancel: () => void;
  onDelete?: () => void;
  isSaving: boolean;
  isDeleting: boolean;
  isEditMode: boolean;
  isDisabled: boolean;
  isSubmitDisabled?: boolean;
  cancelTabIndex?: number;
  saveTabIndex?: number;
  saveText?: string;
  updateText?: string;
  deleteText?: string;
}

/**
 * Unified modal props
 */
export interface UnifiedModalProps {
  /** Modal visibility state */
  isOpen: boolean;

  /** Modal closing animation state */
  isClosing: boolean;

  /** Backdrop click handler */
  onBackdropClick: (e: React.MouseEvent) => void;

  /** Form submit handler (when enableForm is true) */
  onSubmit?: (e: React.FormEvent) => void;

  /** Modal content */
  children: ReactNode;

  /** Animation configuration */
  animation?: ModalAnimationConfig;

  /** Layout configuration */
  layout?: ModalLayoutConfig;

  /** Form action configuration (when enableFooter is true) */
  formAction?: FormActionConfig;

  /** Comparison mode offset (for side-by-side modals) */
  comparisonOffset?: boolean;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default animation configuration
 */
const DEFAULT_ANIMATION: ModalAnimationConfig = {
  backdrop: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
  modal: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  content: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  },
};

/**
 * Default layout configuration
 */
const DEFAULT_LAYOUT: ModalLayoutConfig = {
  containerClass:
    'rounded-xl bg-white shadow-xl w-[75vw] max-h-[90vh] flex flex-col',
  contentClass: 'flex-1 flex flex-col min-h-0',
  backdropClass:
    'fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 backdrop-blur-xs',
  enableForm: false,
  enableFooter: false,
};

// ============================================================================
// UNIFIED MODAL COMPONENT
// ============================================================================

/**
 * Unified modal template component
 *
 * Provides consistent modal behavior with flexible content patterns.
 * Can be configured for simple content modals or complex form modals.
 */
export function UnifiedModal({
  isOpen,
  isClosing,
  onBackdropClick,
  onSubmit,
  children,
  animation = DEFAULT_ANIMATION,
  layout = DEFAULT_LAYOUT,
  formAction,
  comparisonOffset = false,
}: UnifiedModalProps) {
  // Merge configurations with defaults
  const animationConfig = {
    backdrop: { ...DEFAULT_ANIMATION.backdrop, ...animation.backdrop },
    modal: { ...DEFAULT_ANIMATION.modal, ...animation.modal },
    content: { ...DEFAULT_ANIMATION.content, ...animation.content },
  };

  const layoutConfig = { ...DEFAULT_LAYOUT, ...layout };

  // Apply comparison offset to modal animation
  const modalVariants = {
    ...animationConfig.modal,
    visible: {
      ...animationConfig.modal.visible,
      x: comparisonOffset ? -200 : 0,
    },
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="unified-modal-backdrop"
          variants={animationConfig.backdrop}
          initial="hidden"
          animate={isClosing ? 'exit' : 'visible'}
          exit="exit"
          transition={{ duration: 0.15 }}
          className={layoutConfig.backdropClass}
          onClick={e => {
            if (e.target === e.currentTarget && !isClosing) {
              onBackdropClick(e);
            }
          }}
        >
          <motion.div
            key="unified-modal-content"
            variants={modalVariants}
            initial="hidden"
            animate={isClosing ? 'exit' : 'visible'}
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={layoutConfig.containerClass}
            onClick={e => e.stopPropagation()}
          >
            {layoutConfig.enableForm ? (
              <motion.form
                key="unified-modal-form"
                variants={animationConfig.content}
                initial="hidden"
                animate={isClosing ? 'exit' : 'visible'}
                exit="exit"
                transition={{ duration: 0.2, delay: 0.1 }}
                onSubmit={onSubmit}
                className={layoutConfig.contentClass}
              >
                <div className="flex-1 overflow-y-auto">{children}</div>

                {layoutConfig.enableFooter && formAction && (
                  <CardFooter className="sticky bottom-0 z-10 py-6! px-6!">
                    <FormAction
                      onCancel={formAction.onCancel}
                      onDelete={formAction.onDelete}
                      isSaving={formAction.isSaving}
                      isDeleting={formAction.isDeleting}
                      isEditMode={formAction.isEditMode}
                      cancelTabIndex={formAction.cancelTabIndex || 20}
                      saveTabIndex={formAction.saveTabIndex || 21}
                      isDisabled={formAction.isDisabled}
                      isSubmitDisabled={formAction.isSubmitDisabled}
                      saveText={formAction.saveText || 'Simpan'}
                      updateText={formAction.updateText || 'Update'}
                      deleteText={formAction.deleteText || 'Hapus'}
                    />
                  </CardFooter>
                )}
              </motion.form>
            ) : (
              <motion.div
                key="unified-modal-simple"
                variants={animationConfig.content}
                initial="hidden"
                animate={isClosing ? 'exit' : 'visible'}
                exit="exit"
                transition={{ duration: 0.2, delay: 0.05 }}
              >
                {children}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ============================================================================
// SPECIALIZED MODAL FACTORIES
// ============================================================================

/**
 * Entity modal configuration (simple content modal)
 */
// eslint-disable-next-line react-refresh/only-export-components
export const ENTITY_MODAL_CONFIG: Partial<UnifiedModalProps> = {
  layout: {
    ...DEFAULT_LAYOUT,
    enableForm: false,
    enableFooter: false,
  },
};

/**
 * Item modal configuration (complex form modal)
 */
// eslint-disable-next-line react-refresh/only-export-components
export const ITEM_MODAL_CONFIG: Partial<UnifiedModalProps> = {
  layout: {
    ...DEFAULT_LAYOUT,
    enableForm: true,
    enableFooter: true,
  },
};

/**
 * Entity modal factory - creates simple content modals
 */
export interface EntityModalProps {
  isOpen: boolean;
  isClosing: boolean;
  onBackdropClick: (e: React.MouseEvent) => void;
  children: ReactNode;
  comparisonOffset?: boolean;
}

export function EntityModal(props: EntityModalProps) {
  return <UnifiedModal {...props} {...ENTITY_MODAL_CONFIG} />;
}

/**
 * Item modal factory - creates complex form modals
 */
export interface ItemModalProps {
  isOpen: boolean;
  isClosing: boolean;
  onBackdropClick: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: ReactNode;
  formAction: FormActionConfig;
}

export function ItemModal({ onBackdropClick, ...props }: ItemModalProps) {
  return (
    <UnifiedModal
      {...props}
      onBackdropClick={() => onBackdropClick()}
      {...ITEM_MODAL_CONFIG}
    />
  );
}
