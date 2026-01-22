import {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  RefObject,
} from 'react';
import { DROPDOWN_CONSTANTS } from '../constants';

interface UseScrollManagementProps {
  isOpen: boolean;
  filteredOptions: Array<{ id: string; name: string }>;
  optionsContainerRef: RefObject<HTMLDivElement | null>;
  autoScrollOnOpen: boolean;
}

export const useScrollManagement = ({
  isOpen,
  filteredOptions,
  optionsContainerRef,
  autoScrollOnOpen,
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

  // Initial scroll ONLY when dropdown first opens
  useLayoutEffect(() => {
    if (!autoScrollOnOpen) return;
    if (!isOpen || hasInitialScrolled) return;
    if (!optionsContainerRef.current || filteredOptions.length === 0) return;

    const container = optionsContainerRef.current;
    const optionElements = container.querySelectorAll('[role="option"]');

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
      const element = highlightedElement as HTMLElement;
      const containerHeight = container.clientHeight;
      const maxScrollTop = container.scrollHeight - containerHeight;
      const padding = 12;
      const targetScrollTop = Math.min(
        maxScrollTop,
        Math.max(0, element.offsetTop - padding)
      );
      container.scrollTop = targetScrollTop;
    }
    requestAnimationFrame(() => {
      setHasInitialScrolled(true);
    });
  }, [
    autoScrollOnOpen,
    isOpen,
    hasInitialScrolled,
    filteredOptions.length,
    optionsContainerRef,
  ]);

  return {
    scrollState,
    checkScroll,
  };
};
