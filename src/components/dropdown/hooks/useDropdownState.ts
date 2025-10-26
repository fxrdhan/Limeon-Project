import { useState, useCallback, useId, useRef } from 'react';
import { DROPDOWN_CONSTANTS } from '../constants';

let activeDropdownCloseCallback: (() => void) | null = null;
let activeDropdownId: string | null = null;

export const useDropdownState = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [applyOpenStyles, setApplyOpenStyles] = useState(false);
  const instanceId = useId();
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const actualCloseDropdown = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      closeTimeoutRef.current = null;
      if (activeDropdownId === instanceId) {
        activeDropdownCloseCallback = null;
        activeDropdownId = null;
      }
    }, DROPDOWN_CONSTANTS.ANIMATION_DURATION);
  }, [instanceId]);

  const openThisDropdown = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (
      activeDropdownId !== null &&
      activeDropdownId !== instanceId &&
      activeDropdownCloseCallback
    ) {
      activeDropdownCloseCallback();
    }

    setIsClosing(false);
    setIsOpen(true);
    activeDropdownCloseCallback = actualCloseDropdown;
    activeDropdownId = instanceId;
  }, [instanceId, actualCloseDropdown]);

  const toggleDropdown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // Prevent toggle during closing animation to avoid race conditions
      if (isClosing) {
        return;
      }
      if (isOpen) {
        actualCloseDropdown();
      } else {
        openThisDropdown();
      }
    },
    [isOpen, isClosing, actualCloseDropdown, openThisDropdown]
  );

  return {
    isOpen,
    isClosing,
    applyOpenStyles,
    setApplyOpenStyles,
    openThisDropdown,
    actualCloseDropdown,
    toggleDropdown,
  };
};
