import React from 'react';
import { AnimatePresence } from 'motion/react';
import { ValidationOverlayProps } from './types';
import { DEFAULT_AUTO_HIDE_DELAY } from './constants';
import { useOverlayPosition } from './hooks/useOverlayPosition';
import { useOverlayVisibility } from './hooks/useOverlayVisibility';
import { useAutoHide } from './hooks/useAutoHide';
import ValidationPortal from './components/ValidationPortal';
import ValidationOverlayContent from './components/ValidationOverlayContent';

export type { ValidationOverlayProps } from './types';

const ValidationOverlay: React.FC<ValidationOverlayProps> = ({
  error,
  showError,
  targetRef,
  autoHide = true,
  autoHideDelay = DEFAULT_AUTO_HIDE_DELAY,
  onAutoHide,
  isHovered = false,
  hasAutoHidden = false,
  isOpen = false,
}) => {
  // Use custom hooks
  const position = useOverlayPosition({
    showError,
    error,
    targetRef,
    isOpen,
  });

  const { showOverlay, setShowOverlay } = useOverlayVisibility({
    showError,
    hasAutoHidden,
    error,
    isHovered,
    isOpen,
  });

  useAutoHide({
    showOverlay,
    error,
    autoHide,
    autoHideDelay,
    hasAutoHidden,
    onAutoHide,
    setShowOverlay,
  });

  if (!error || !position) {
    return null;
  }

  return (
    <ValidationPortal>
      <AnimatePresence>
        {showOverlay && (
          <ValidationOverlayContent error={error} position={position} />
        )}
      </AnimatePresence>
    </ValidationPortal>
  );
};

export default ValidationOverlay;
