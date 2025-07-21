import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaExclamationTriangle } from "react-icons/fa";

export interface ValidationOverlayProps {
  error: string | null;
  showError: boolean;
  targetRef: React.RefObject<HTMLElement | null>;
  autoHide?: boolean;
  autoHideDelay?: number;
  onAutoHide?: () => void;
  isHovered?: boolean;
  hasAutoHidden?: boolean;
  isOpen?: boolean; // For dropdown - don't show when dropdown is open
}

const ValidationOverlay: React.FC<ValidationOverlayProps> = ({
  error,
  showError,
  targetRef,
  autoHide = true,
  autoHideDelay = 3000,
  onAutoHide,
  isHovered = false,
  hasAutoHidden = false,
  isOpen = false,
}) => {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate position based on target element
  useEffect(() => {
    if (showError && error && targetRef.current && !isOpen) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [showError, error, targetRef, isOpen]);

  // Handle show/hide logic
  useEffect(() => {
    if (hasAutoHidden && error) {
      // After auto-hide, show on hover
      setShowOverlay(isHovered && !isOpen);
    } else {
      // Normal display logic
      setShowOverlay(showError && !isOpen);
    }
  }, [showError, hasAutoHidden, error, isHovered, isOpen]);

  // Auto-hide timeout
  useEffect(() => {
    if (showOverlay && error && autoHide && autoHideDelay > 0 && !hasAutoHidden) {
      autoHideTimeoutRef.current = setTimeout(() => {
        setShowOverlay(false);
        onAutoHide?.();
      }, autoHideDelay);
    }

    return () => {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
        autoHideTimeoutRef.current = null;
      }
    };
  }, [showOverlay, error, autoHide, autoHideDelay, hasAutoHidden, onAutoHide]);

  if (!error || !position) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {showOverlay && (
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