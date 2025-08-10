import { useState, useCallback, useEffect, RefObject } from 'react';
import { DROPDOWN_CONSTANTS } from '../constants';

interface UseScrollManagementProps {
  isOpen: boolean;
  applyOpenStyles: boolean;
  filteredOptions: Array<{ id: string; name: string }>;
  scrollToHighlightedOption: () => void;
  optionsContainerRef: RefObject<HTMLDivElement | null>;
}

export const useScrollManagement = ({
  isOpen,
  applyOpenStyles,
  filteredOptions,
  scrollToHighlightedOption,
  optionsContainerRef,
}: UseScrollManagementProps) => {
  const [scrollState, setScrollState] = useState({
    isScrollable: false,
    reachedBottom: false,
    scrolledFromTop: false,
  });

  // Track if dropdown just opened (allow initial scroll only)
  const [hasInitialScrolled, setHasInitialScrolled] = useState(false);

  const checkScroll = useCallback(() => {
    if (!optionsContainerRef.current) return;
    const container = optionsContainerRef.current;
    
    setScrollState({
      isScrollable: container.scrollHeight > container.clientHeight,
      reachedBottom:
        Math.abs(
          container.scrollHeight - container.scrollTop - container.clientHeight
        ) < DROPDOWN_CONSTANTS.SCROLL_THRESHOLD,
      scrolledFromTop:
        container.scrollTop > DROPDOWN_CONSTANTS.SCROLL_THRESHOLD,
    });
  }, [optionsContainerRef]);

  // Scroll state management
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(checkScroll, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, filteredOptions, checkScroll]);

  // Add scroll event listener
  useEffect(() => {
    const optionsContainer = optionsContainerRef.current;
    if (optionsContainer && isOpen) {
      optionsContainer.addEventListener('scroll', checkScroll);
      return () => optionsContainer.removeEventListener('scroll', checkScroll);
    }
  }, [isOpen, checkScroll, optionsContainerRef]);

  // Keyboard navigation scrolling is now handled directly in useKeyboardNavigation
  // This effect is intentionally removed to prevent conflicts

  // Initial scroll ONLY when dropdown first opens
  useEffect(() => {
    if (isOpen && applyOpenStyles && !hasInitialScrolled) {
      if (optionsContainerRef.current && filteredOptions.length > 0) {
        scrollToHighlightedOption();
        setHasInitialScrolled(true);
      }
    }
    
    // Reset when dropdown closes
    if (!isOpen) {
      setHasInitialScrolled(false);
    }
  }, [
    isOpen,
    applyOpenStyles,
    hasInitialScrolled,
    filteredOptions.length,
    scrollToHighlightedOption,
    optionsContainerRef,
  ]);

  return {
    scrollState,
    checkScroll,
  };
};
