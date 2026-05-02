import { useState, useCallback, useRef, useEffect } from 'react';
import { COMBOBOX_CONSTANTS } from '../constants';
import { createComboboxChangeDetails } from '../utils/eventDetails';
import type { ComboboxOpenChangeDetails } from '@/types';

interface UseComboboxStateOptions {
  shouldKeepOpen?: () => boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: ComboboxOpenChangeDetails) => void;
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
    (nextOpen: boolean, details?: ComboboxOpenChangeDetails) => {
      const changeDetails =
        details ?? createComboboxChangeDetails('none' as const);

      onOpenChange?.(nextOpen, changeDetails);

      if (changeDetails.isCanceled) {
        return false;
      }

      if (!isControlled) {
        setUncontrolledIsOpen(nextOpen);
      }

      return true;
    },
    [isControlled, onOpenChange]
  );

  const actualCloseCombobox = useCallback(
    (force = false, details?: ComboboxOpenChangeDetails) => {
      if (!force && shouldKeepOpen?.()) {
        return false;
      }

      const didChange = setOpenState(false, details);
      if (!didChange) {
        return false;
      }

      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      setIsClosing(true);
      closeTimeoutRef.current = setTimeout(() => {
        setIsClosing(false);
        closeTimeoutRef.current = null;
      }, COMBOBOX_CONSTANTS.ANIMATION_DURATION);

      return true;
    },
    [setOpenState, shouldKeepOpen]
  );

  const openThisCombobox = useCallback(
    (details?: ComboboxOpenChangeDetails) => {
      const didChange = setOpenState(true, details);
      if (!didChange) {
        return false;
      }

      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }

      setIsClosing(false);
      return true;
    },
    [setOpenState]
  );

  const toggleCombobox = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // Prevent toggle during closing animation to avoid race conditions
      if (isClosing) {
        return;
      }
      if (isOpen) {
        actualCloseCombobox(
          true,
          createComboboxChangeDetails('trigger-press', e)
        );
      } else {
        openThisCombobox(createComboboxChangeDetails('trigger-press', e));
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
