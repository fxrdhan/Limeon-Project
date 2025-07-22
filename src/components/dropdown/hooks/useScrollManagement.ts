import { useEffect } from 'react';
import type { UseScrollManagementProps } from '../types';

export const useScrollManagement = ({
  isOpen,
  applyOpenStyles,
  filteredOptions,
  highlightedIndex,
  checkScroll,
  scrollToHighlightedOption,
  optionsContainerRef,
}: UseScrollManagementProps) => {
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
};