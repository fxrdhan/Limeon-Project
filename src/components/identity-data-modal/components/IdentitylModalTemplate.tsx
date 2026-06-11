import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

interface IdentityModalTemplateProps {
  isOpen: boolean;
  onClose: () => void;
  resetInternalState?: () => void;
  children: React.ReactNode;
}

const IdentityModalTemplate: React.FC<IdentityModalTemplateProps> = ({
  isOpen,
  onClose,
  resetInternalState,
  children,
}) => {
  const dialogPanelRef = useRef<HTMLDivElement>(null);
  const [, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);

    requestAnimationFrame(() => {
      const searchInput = document.querySelector(
        'input[placeholder*="Cari"]'
      ) as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
      }
    });

    onClose();
  };

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        setIsClosing(false);
        if (resetInternalState) resetInternalState();

        setTimeout(() => {
          const searchInput = document.querySelector(
            'input[placeholder*="Cari"]'
          ) as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
        }, 50);
      }}
    >
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            aria-hidden="true"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          <motion.div
            ref={dialogPanelRef}
            onClick={e => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default IdentityModalTemplate;
