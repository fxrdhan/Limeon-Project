import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaExclamationTriangle } from "react-icons/fa";

interface ValidationOverlayProps {
  isVisible: boolean;
  error: string | null;
  targetRef: React.RefObject<HTMLElement | null>;
  onClose?: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

const ValidationOverlay: React.FC<ValidationOverlayProps> = ({
  isVisible,
  error,
  targetRef,
  onClose,
  autoHide = true,
  autoHideDelay = 3000,
}) => {
  const [position, setPosition] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isVisible && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });

      // Auto hide after delay
      if (autoHide && autoHideDelay > 0) {
        timeoutRef.current = setTimeout(() => {
          onClose?.();
        }, autoHideDelay);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible, targetRef, onClose, autoHide, autoHideDelay]);

  if (!error || !position) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: position.top,
            left: position.left,
          }}
        >
          <div className="bg-danger/75 text-white text-sm px-3 py-2 rounded-lg shadow-lg backdrop-blur-xs flex items-center gap-2 w-fit">
            <FaExclamationTriangle
              className="text-yellow-300 flex-shrink-0"
              size={14}
            />
            <span className="font-medium">{error}</span>
          </div>
          {/* Arrow pointing up */}
          <div className="absolute -top-1 left-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-danger/75 backdrop-blur-xs"></div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default ValidationOverlay;
