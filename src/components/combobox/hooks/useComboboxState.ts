import { useState, useCallback, useId, useRef, useEffect } from 'react';
import { COMBOBOX_CONSTANTS } from '../constants';

let activeComboboxCloseCallback: (() => void) | null = null;
let activeComboboxId: string | null = null;

interface UseComboboxStateOptions {
  shouldKeepOpen?: () => boolean;
}

export const useComboboxState = (options: UseComboboxStateOptions = {}) => {
  const { shouldKeepOpen } = options;
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [applyOpenStyles, setApplyOpenStyles] = useState(false);
  const instanceId = useId();
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const actualCloseCombobox = useCallback(
    (force = false) => {
      if (!force && shouldKeepOpen?.()) {
        return;
      }

      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      setIsClosing(true);
      closeTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
        closeTimeoutRef.current = null;
        if (activeComboboxId === instanceId) {
          activeComboboxCloseCallback = null;
          activeComboboxId = null;
        }
      }, COMBOBOX_CONSTANTS.ANIMATION_DURATION);
    },
    [instanceId, shouldKeepOpen]
  );

  const openThisCombobox = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (
      activeComboboxId !== null &&
      activeComboboxId !== instanceId &&
      activeComboboxCloseCallback
    ) {
      activeComboboxCloseCallback();
    }

    setIsClosing(false);
    setIsOpen(true);
    activeComboboxCloseCallback = actualCloseCombobox;
    activeComboboxId = instanceId;
  }, [instanceId, actualCloseCombobox]);

  const toggleCombobox = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // Prevent toggle during closing animation to avoid race conditions
      if (isClosing) {
        return;
      }
      if (isOpen) {
        actualCloseCombobox(true);
      } else {
        openThisCombobox();
      }
    },
    [isOpen, isClosing, actualCloseCombobox, openThisCombobox]
  );

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      if (activeComboboxId === instanceId) {
        activeComboboxCloseCallback = null;
        activeComboboxId = null;
      }
    };
  }, [instanceId]);

  return {
    isOpen,
    isClosing,
    applyOpenStyles,
    setApplyOpenStyles,
    openThisCombobox,
    actualCloseCombobox,
    toggleCombobox,
  };
};
