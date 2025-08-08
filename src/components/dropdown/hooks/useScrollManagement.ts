import { useState, useCallback, useEffect, RefObject } from 'react';
import { DROPDOWN_CONSTANTS } from '../constants';

interface UseScrollManagementProps {
  isOpen: boolean;
  applyOpenStyles: boolean;
  filteredOptions: Array<{ id: string; name: string }>;
  highlightedIndex: number;
  scrollToHighlightedOption: () => void;
  optionsContainerRef: RefObject<HTMLDivElement | null>;
}

export const useScrollManagement = ({
  isOpen,
  applyOpenStyles,
  filteredOptions,
  highlightedIndex,
  scrollToHighlightedOption,
  optionsContainerRef,
}: UseScrollManagementProps) => {
  const [scrollState, setScrollState] = useState({
    isScrollable: false,
    reachedBottom: false,
    scrolledFromTop: false,
  });

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

  return {
    scrollState,
    checkScroll,
  };
};
