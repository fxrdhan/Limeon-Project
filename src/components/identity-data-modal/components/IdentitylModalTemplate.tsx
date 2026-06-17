import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { focusIdentitySearchInput } from '../focus';

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
  const searchFocusFrameRef = useRef<number | null>(null);
  const searchFocusTimerRef = useRef<number | null>(null);
  const [, setIsClosing] = useState(false);

  const cancelScheduledSearchFocus = useCallback(() => {
    if (searchFocusFrameRef.current !== null) {
      window.cancelAnimationFrame(searchFocusFrameRef.current);
      searchFocusFrameRef.current = null;
    }
    if (searchFocusTimerRef.current !== null) {
      window.clearTimeout(searchFocusTimerRef.current);
      searchFocusTimerRef.current = null;
    }
  }, []);

  const scheduleSearchFocusFrame = useCallback(() => {
    if (searchFocusFrameRef.current !== null) {
      window.cancelAnimationFrame(searchFocusFrameRef.current);
    }
    const frameId = window.requestAnimationFrame(() => {
      if (searchFocusFrameRef.current === frameId) {
        searchFocusFrameRef.current = null;
        focusIdentitySearchInput();
      }
    });
    searchFocusFrameRef.current = frameId;
  }, []);

  const scheduleSearchFocusAfterExit = useCallback(() => {
    if (searchFocusTimerRef.current !== null) {
      window.clearTimeout(searchFocusTimerRef.current);
    }
    searchFocusTimerRef.current = window.setTimeout(() => {
      searchFocusTimerRef.current = null;
      focusIdentitySearchInput();
    }, 50);
  }, []);

  useEffect(() => {
    if (isOpen) {
      cancelScheduledSearchFocus();
    }
  }, [cancelScheduledSearchFocus, isOpen]);

  useEffect(() => {
    return cancelScheduledSearchFocus;
  }, [cancelScheduledSearchFocus]);

  const handleClose = () => {
    setIsClosing(true);
    scheduleSearchFocusFrame();

    onClose();
  };

  return createPortal(
    <AnimatePresence
      onExitComplete={() => {
        setIsClosing(false);
        if (resetInternalState) resetInternalState();
        scheduleSearchFocusAfterExit();
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
