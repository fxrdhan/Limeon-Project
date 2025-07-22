import { useState, useCallback, useRef } from 'react';
import { DROPDOWN_CONSTANTS } from '../constants';

export const useDropdownHover = (
  hoverToOpen: boolean,
  isOpen: boolean,
  isClosing: boolean,
  openThisDropdown: () => void,
  actualCloseDropdown: () => void,
) => {
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTriggerAreaEnter = useCallback(() => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    // Only open on hover if explicitly enabled and not already open
    if (hoverToOpen && !isOpen && !isClosing) {
      hoverTimeoutRef.current = setTimeout(() => {
        openThisDropdown();
      }, DROPDOWN_CONSTANTS.HOVER_TIMEOUT);
    }
  }, [hoverToOpen, openThisDropdown, isOpen, isClosing]);

  const handleMenuEnter = useCallback(() => {
    [leaveTimeoutRef, hoverTimeoutRef].forEach((ref) => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
  }, []);

  const handleMouseLeaveWithCloseIntent = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Only set close timeout if hover-to-open is enabled and dropdown is actually open
    if (hoverToOpen && isOpen) {
      leaveTimeoutRef.current = setTimeout(actualCloseDropdown, DROPDOWN_CONSTANTS.CLOSE_TIMEOUT);
    }
  }, [actualCloseDropdown, hoverToOpen, isOpen]);

  const clearTimeouts = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  }, []);

  return {
    isHovered,
    setIsHovered,
    hoverTimeoutRef,
    leaveTimeoutRef,
    handleTriggerAreaEnter,
    handleMenuEnter,
    handleMouseLeaveWithCloseIntent,
    clearTimeouts,
  };
};