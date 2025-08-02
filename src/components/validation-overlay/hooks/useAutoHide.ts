import { useEffect, useRef } from 'react';
import { DEFAULT_AUTO_HIDE_DELAY } from '../constants';

interface UseAutoHideProps {
  showOverlay: boolean;
  error: string | null;
  autoHide: boolean;
  autoHideDelay?: number;
  hasAutoHidden: boolean;
  onAutoHide?: () => void;
  setShowOverlay: (show: boolean) => void;
}

export const useAutoHide = ({
  showOverlay,
  error,
  autoHide,
  autoHideDelay = DEFAULT_AUTO_HIDE_DELAY,
  hasAutoHidden,
  onAutoHide,
  setShowOverlay,
}: UseAutoHideProps) => {
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (
      showOverlay &&
      error &&
      autoHide &&
      autoHideDelay > 0 &&
      !hasAutoHidden
    ) {
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
  }, [
    showOverlay,
    error,
    autoHide,
    autoHideDelay,
    hasAutoHidden,
    onAutoHide,
    setShowOverlay,
  ]);

  return autoHideTimeoutRef;
};
