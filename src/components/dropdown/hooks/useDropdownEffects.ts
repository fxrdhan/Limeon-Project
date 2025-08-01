import { useEffect } from 'react';
import { DROPDOWN_CONSTANTS } from '../constants';
import type { UseDropdownEffectsProps } from '../types';

export const useDropdownEffects = ({
  isOpen,
  applyOpenStyles,
  filteredOptions,
  value,
  setApplyOpenStyles,
  setHighlightedIndex,
  setExpandedId,
  calculateDropdownPosition,
  manageFocusOnOpen,
  handleFocusOut,
  clearTimeouts,
  resetPosition,
  resetSearch,
  checkScroll,
  scrollToHighlightedOption,
  buttonRef,
  dropdownMenuRef,
  optionsContainerRef,
  highlightedIndex,
}: UseDropdownEffectsProps) => {
  // Set initial highlighted index when dropdown opens
  useEffect(() => {
    if (isOpen && filteredOptions.length > 0) {
      const selectedIndex = value
        ? filteredOptions.findIndex((option) => option.id === value)
        : -1;
      const initialIndex = selectedIndex >= 0 ? selectedIndex : -1;
      setHighlightedIndex(initialIndex);

      const highlightedOption = initialIndex >= 0 ? filteredOptions[initialIndex] : null;
      if (highlightedOption && buttonRef.current) {
        const buttonWidth = buttonRef.current.getBoundingClientRect().width;
        const maxTextWidth = buttonWidth - DROPDOWN_CONSTANTS.BUTTON_PADDING;
        const shouldTruncate = () => {
          const tempSpan = document.createElement('span');
          tempSpan.style.visibility = 'hidden';
          tempSpan.style.position = 'absolute';
          tempSpan.style.fontSize = '14px';
          tempSpan.style.fontFamily = getComputedStyle(buttonRef.current!).fontFamily;
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
    } else {
      setHighlightedIndex(-1);
    }
  }, [filteredOptions, isOpen, value, setExpandedId, setHighlightedIndex, buttonRef]);

  // Manage open/close states and event listeners
  useEffect(() => {
    let openStyleTimerId: NodeJS.Timeout | undefined;

    if (isOpen) {
      // Clear any pending hover timeout when dropdown opens
      clearTimeouts();

      document.body.style.overflow = 'hidden';
      openStyleTimerId = setTimeout(() => {
        setApplyOpenStyles(true);
        requestAnimationFrame(() => {
          if (dropdownMenuRef.current) {
            calculateDropdownPosition();
            manageFocusOnOpen();
          }
        });
      }, 20);

      const events = [
        ['scroll', calculateDropdownPosition, true],
        ['resize', calculateDropdownPosition, false],
        ['focusout', handleFocusOut, false],
      ] as const;

      events.forEach(([event, handler, capture]) =>
        window.addEventListener(event, handler as EventListener, capture),
      );

      return () => {
        document.body.style.overflow = '';
        if (openStyleTimerId) clearTimeout(openStyleTimerId);
        events.forEach(([event, handler, capture]) =>
          window.removeEventListener(event, handler as EventListener, capture),
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
  ]);

  // Position recalculation
  useEffect(() => {
    if (isOpen && applyOpenStyles) {
      const timer = setTimeout(calculateDropdownPosition, 10);
      return () => clearTimeout(timer);
    }
  }, [
    filteredOptions,
    isOpen,
    applyOpenStyles,
    calculateDropdownPosition,
  ]);

  // Scroll state management
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(checkScroll, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, filteredOptions, checkScroll]);

  useEffect(() => {
    const optionsContainer = optionsContainerRef.current;
    if (optionsContainer && isOpen) {
      optionsContainer.addEventListener('scroll', checkScroll);
      return () => optionsContainer.removeEventListener('scroll', checkScroll);
    }
  }, [isOpen, checkScroll, optionsContainerRef]);

  // Scroll to highlighted option
  useEffect(() => {
    scrollToHighlightedOption();
  }, [highlightedIndex, isOpen, filteredOptions, scrollToHighlightedOption]);

  // Reset scroll position when dropdown opens
  useEffect(() => {
    if (
      isOpen &&
      applyOpenStyles &&
      optionsContainerRef.current &&
      filteredOptions.length > 0
    ) {
      scrollToHighlightedOption();
    }
  }, [
    isOpen,
    applyOpenStyles,
    filteredOptions.length,
    highlightedIndex,
    scrollToHighlightedOption,
    optionsContainerRef,
  ]);
};