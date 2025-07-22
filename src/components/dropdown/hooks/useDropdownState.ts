import { useState, useCallback, useId } from 'react';
import { DROPDOWN_CONSTANTS } from '../constants';

let activeDropdownCloseCallback: (() => void) | null = null;
let activeDropdownId: string | null = null;

export const useDropdownState = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [applyOpenStyles, setApplyOpenStyles] = useState(false);
  const instanceId = useId();

  const actualCloseDropdown = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      if (activeDropdownId === instanceId) {
        activeDropdownCloseCallback = null;
        activeDropdownId = null;
      }
    }, DROPDOWN_CONSTANTS.ANIMATION_DURATION);
  }, [instanceId]);

  const openThisDropdown = useCallback(() => {
    if (
      activeDropdownId !== null &&
      activeDropdownId !== instanceId &&
      activeDropdownCloseCallback
    ) {
      activeDropdownCloseCallback();
    }
    setIsOpen(true);
    activeDropdownCloseCallback = actualCloseDropdown;
    activeDropdownId = instanceId;
  }, [instanceId, actualCloseDropdown]);

  const toggleDropdown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (isOpen) {
        actualCloseDropdown();
      } else {
        openThisDropdown();
      }
    },
    [isOpen, actualCloseDropdown, openThisDropdown],
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