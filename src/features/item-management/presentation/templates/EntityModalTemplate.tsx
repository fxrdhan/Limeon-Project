import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEntityModal } from '../../shared/contexts/EntityModalContext';
import type { ReactNode } from 'react';

interface EntityModalTemplateProps {
  children: ReactNode;
}

const EntityModalTemplate: React.FC<EntityModalTemplateProps> = ({
  children,
}) => {
  const { ui, uiActions, comparison } = useEntityModal();
  const { isOpen, isClosing } = ui;
  const { handleBackdropClick } = uiActions;

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      x: comparison.isOpen ? -190 : 0,
    },
    exit: { opacity: 0, scale: 0.95 },
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="entity-modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate={isClosing ? 'exit' : 'visible'}
          exit="exit"
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 backdrop-blur-xs"
          onClick={e => {
            if (e.target === e.currentTarget && !isClosing) {
              handleBackdropClick(e);
            }
          }}
        >
          <motion.div
            key="entity-modal-content"
            variants={modalVariants}
            initial="hidden"
            animate={isClosing ? 'exit' : 'visible'}
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            layout
            onClick={e => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default EntityModalTemplate;
