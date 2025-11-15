import { useState, useCallback, useEffect, RefObject } from 'react';
import { DROPDOWN_CONSTANTS } from '../constants';

interface UseScrollManagementProps {
  isOpen: boolean;
  applyOpenStyles: boolean;
  filteredOptions: Array<{ id: string; name: string }>;
  optionsContainerRef: RefObject<HTMLDivElement | null>;
}

export const useScrollManagement = ({
  isOpen,
  applyOpenStyles,
  filteredOptions,
  optionsContainerRef,
}: UseScrollManagementProps) => {
  const [scrollState, setScrollState] = useState({
    isScrollable: false,
    reachedBottom: false,
    scrolledFromTop: false,
  });

  // Track if dropdown just opened (allow initial scroll only)
  // Use getDerivedStateFromProps pattern to reset when isOpen changes
  const [scrollResetState, setScrollResetState] = useState({
    isOpen,
    hasInitialScrolled: false,
  });

  if (isOpen !== scrollResetState.isOpen) {
    // Reset when isOpen changes
    setScrollResetState({ isOpen, hasInitialScrolled: false });
  }

  const hasInitialScrolled = scrollResetState.hasInitialScrolled;
  const setHasInitialScrolled = (value: boolean) => {
    setScrollResetState(prev => ({ ...prev, hasInitialScrolled: value }));
  };

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

  // Initial scroll ONLY when dropdown first opens with smooth animation
  useEffect(() => {
    if (isOpen && applyOpenStyles && !hasInitialScrolled) {
      if (optionsContainerRef.current && filteredOptions.length > 0) {
        // Delay the scroll animation slightly to allow portal to render
        const scrollTimer = setTimeout(() => {
          if (optionsContainerRef.current) {
            const container = optionsContainerRef.current;
            const optionElements =
              container.querySelectorAll('[role="option"]');

            // Find the highlighted/selected option using aria-selected or current highlight classes
            const highlightedElement =
              Array.from(optionElements).find(
                el => el.getAttribute('aria-selected') === 'true'
              ) ||
              Array.from(optionElements).find(
                el =>
                  el.classList.contains('bg-slate-300/50') ||
                  el.classList.contains('bg-slate-300/30')
              );

            if (highlightedElement) {
              // Use smooth scrolling behavior
              (highlightedElement as HTMLElement).scrollIntoView({
                block: 'nearest',
                behavior: 'smooth',
              });
            }
          }
          setHasInitialScrolled(true);
        }, 100); // Small delay for portal render

        return () => clearTimeout(scrollTimer);
      }
    }

    // State auto-resets when component remounts or isOpen changes
  }, [
    isOpen,
    applyOpenStyles,
    hasInitialScrolled,
    filteredOptions.length,
    optionsContainerRef,
  ]);

  return {
    scrollState,
    checkScroll,
  };
};
