import { useEffect, useState, useCallback, useRef } from 'react';
import { DROPDOWN_CONSTANTS } from '../constants';
import type { UseDropdownEffectsProps } from '../types';

export const useDropdownEffects = ({
  isOpen,
  applyOpenStyles,
  filteredOptions,
  value,
  setApplyOpenStyles,
  setExpandedId,
  calculateDropdownPosition,
  manageFocusOnOpen,
  handleFocusOut,
  resetPosition,
  resetSearch,
  buttonRef,
  dropdownMenuRef,
  hoverToOpen,
  isClosing,
  openThisDropdown,
  actualCloseDropdown,
}: UseDropdownEffectsProps) => {
  // Hover state management
  const [isHovered, setIsHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    [leaveTimeoutRef, hoverTimeoutRef].forEach(ref => {
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
      leaveTimeoutRef.current = setTimeout(
        actualCloseDropdown,
        DROPDOWN_CONSTANTS.CLOSE_TIMEOUT
      );
    }
  }, [actualCloseDropdown, hoverToOpen, isOpen]);
  // Set initial expanded text when dropdown opens
  useEffect(() => {
    if (isOpen && filteredOptions.length > 0) {
      const selectedIndex = value
        ? filteredOptions.findIndex(option => option.id === value)
        : -1;
      const highlightedOption =
        selectedIndex >= 0 ? filteredOptions[selectedIndex] : null;
      if (highlightedOption && buttonRef.current) {
        const buttonWidth = buttonRef.current.getBoundingClientRect().width;
        const maxTextWidth = buttonWidth - DROPDOWN_CONSTANTS.BUTTON_PADDING;
        const shouldTruncate = () => {
          const tempSpan = document.createElement('span');
          tempSpan.style.visibility = 'hidden';
          tempSpan.style.position = 'absolute';
          tempSpan.style.fontSize = '14px';
          tempSpan.style.fontFamily = getComputedStyle(
            buttonRef.current!
          ).fontFamily;
          tempSpan.textContent = highlightedOption.name;
          document.body.appendChild(tempSpan);
          const textWidth = tempSpan.offsetWidth;
          document.body.removeChild(tempSpan);
          return textWidth > maxTextWidth;
        };

        if (shouldTruncate()) {
          setExpandedId(highlightedOption.id);
        }
      }
    }
  }, [filteredOptions, isOpen, value, setExpandedId, buttonRef]);

  // Manage open/close states and event listeners
  useEffect(() => {
    let openStyleTimerId: NodeJS.Timeout | undefined;

    if (isOpen) {
      // Clear any pending hover timeout when dropdown opens
      clearTimeouts();

      document.body.style.overflow = 'hidden';
      // Immediately set open styles and calculate position
      setApplyOpenStyles(true);

      // Calculate position after DOM is ready
      openStyleTimerId = setTimeout(() => {
        if (dropdownMenuRef.current) {
          calculateDropdownPosition();
          manageFocusOnOpen();
        }
      }, 10);

      const events = [
        ['scroll', calculateDropdownPosition, true],
        ['resize', calculateDropdownPosition, false],
        ['focusout', handleFocusOut, false],
      ] as const;

      events.forEach(([event, handler, capture]) =>
        window.addEventListener(event, handler as EventListener, capture)
      );

      return () => {
        document.body.style.overflow = '';
        if (openStyleTimerId) clearTimeout(openStyleTimerId);
        events.forEach(([event, handler, capture]) =>
          window.removeEventListener(event, handler as EventListener, capture)
        );
      };
    } else {
      document.body.style.overflow = '';
      setApplyOpenStyles(false);
      resetPosition();
      resetSearch();

      // Clear hover timeout when dropdown is closed
      clearTimeouts();
    }
  }, [
    isOpen,
    calculateDropdownPosition,
    manageFocusOnOpen,
    handleFocusOut,
    clearTimeouts,
    resetPosition,
    resetSearch,
    setApplyOpenStyles,
    dropdownMenuRef,
    buttonRef,
  ]);

  // Position recalculation
  useEffect(() => {
    if (isOpen && applyOpenStyles) {
      const timer = setTimeout(calculateDropdownPosition, 10);
      return () => clearTimeout(timer);
    }
  }, [filteredOptions, isOpen, applyOpenStyles, calculateDropdownPosition]);

  return {
    isHovered,
    setIsHovered,
    leaveTimeoutRef,
    handleTriggerAreaEnter,
    handleMenuEnter,
    handleMouseLeaveWithCloseIntent,
  };
};
