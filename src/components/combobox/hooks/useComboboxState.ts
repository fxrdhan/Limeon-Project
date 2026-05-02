import { useState, useCallback, useRef, useEffect } from 'react';
import { COMBOBOX_CONSTANTS } from '../constants';

interface UseComboboxStateOptions {
  shouldKeepOpen?: () => boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const useComboboxState = (options: UseComboboxStateOptions = {}) => {
  const { shouldKeepOpen, open, defaultOpen = false, onOpenChange } = options;
  const isControlled = open !== undefined;
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(defaultOpen);
  const isOpen = isControlled ? open : uncontrolledIsOpen;
  const [isClosing, setIsClosing] = useState(false);
  const [applyOpenStyles, setApplyOpenStyles] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setOpenState = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledIsOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

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
      setOpenState(false);
      closeTimeoutRef.current = setTimeout(() => {
        setIsClosing(false);
        closeTimeoutRef.current = null;
      }, COMBOBOX_CONSTANTS.ANIMATION_DURATION);
    },
    [setOpenState, shouldKeepOpen]
  );

  const openThisCombobox = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setIsClosing(false);
    setOpenState(true);
  }, [setOpenState]);

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
    };
  }, []);

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
