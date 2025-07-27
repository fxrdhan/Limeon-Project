import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useEntityModal } from "../contexts/EntityModalContext";
import type { ReactNode } from "react";

interface EntityModalTemplateProps {
  children: ReactNode;
}

const EntityModalTemplate: React.FC<EntityModalTemplateProps> = ({ children }) => {
  const { ui, uiActions, comparison } = useEntityModal();
  const { isOpen } = ui;
  const { handleBackdropClick } = uiActions;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto">
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            aria-hidden="true"
            onClick={handleBackdropClick}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: comparison.isOpen ? -208 : 0 // -translate-x-52 = -13rem = -208px
            }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default EntityModalTemplate;