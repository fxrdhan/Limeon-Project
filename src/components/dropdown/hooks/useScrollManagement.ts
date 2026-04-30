import {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  RefObject,
} from 'react';
import { DROPDOWN_CONSTANTS } from '../constants';

interface UseScrollManagementProps {
  isOpen: boolean;
  filteredOptions: Array<{ id: string; name: string }>;
  searchTerm: string;
  selectedValue?: string;
  optionsContainerRef: RefObject<HTMLDivElement | null>;
  autoScrollOnOpen: boolean;
}

const scrollElementToPinnedTop = (
  container: HTMLDivElement,
  element: HTMLElement
) => {
  const containerHeight = container.clientHeight;
  const maxScrollTop = container.scrollHeight - containerHeight;
  const padding = 6;
  const targetScrollTop = Math.min(
    maxScrollTop,
    Math.max(0, element.offsetTop - padding)
  );
  container.scrollTop = targetScrollTop;
};

const getOptionElementAtIndex = (container: HTMLDivElement, index: number) =>
  container.querySelectorAll<HTMLElement>('[role="option"]')[index];

export const useScrollManagement = ({
  isOpen,
  filteredOptions,
  searchTerm,
  selectedValue,
  optionsContainerRef,
  autoScrollOnOpen,
}: UseScrollManagementProps) => {
  const [scrollState, setScrollState] = useState({
    isScrollable: false,
    reachedBottom: false,
    scrolledFromTop: false,
  });
  const shouldRestoreScrollAfterSearchClearRef = useRef(false);
  const restoreScrollFrameRef = useRef<number | null>(null);

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
          el.classList.contains('bg-slate-100') ||
          el.classList.contains('bg-slate-300/50') ||
          el.classList.contains('bg-slate-300/30')
      );

    if (highlightedElement) {
      scrollElementToPinnedTop(container, highlightedElement as HTMLElement);
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

  const firstFilteredOptionId = filteredOptions[0]?.id;

  useLayoutEffect(() => {
    if (restoreScrollFrameRef.current !== null) {
      cancelAnimationFrame(restoreScrollFrameRef.current);
      restoreScrollFrameRef.current = null;
    }

    if (!isOpen) return;
    if (!optionsContainerRef.current) return;

    const hasSearchTerm = searchTerm.trim() !== '';
    const container = optionsContainerRef.current;

    if (hasSearchTerm) {
      shouldRestoreScrollAfterSearchClearRef.current = true;
      container.scrollTop = 0;
      requestAnimationFrame(checkScroll);
      return;
    }

    if (!shouldRestoreScrollAfterSearchClearRef.current) return;

    if (!selectedValue) {
      container.scrollTop = 0;
      shouldRestoreScrollAfterSearchClearRef.current = false;
      requestAnimationFrame(checkScroll);
      return;
    }

    const selectedIndex = filteredOptions.findIndex(
      option => option.id === selectedValue
    );

    if (selectedIndex < 0) return;

    const selectedElement = Array.from(
      container.querySelectorAll<HTMLElement>('[role="option"]')
    )[selectedIndex];

    const restoreSelectedScroll = () => {
      const currentContainer = optionsContainerRef.current;
      if (!currentContainer) return false;

      const currentSelectedElement = getOptionElementAtIndex(
        currentContainer,
        selectedIndex
      );

      if (!currentSelectedElement) return false;

      scrollElementToPinnedTop(currentContainer, currentSelectedElement);
      shouldRestoreScrollAfterSearchClearRef.current = false;
      requestAnimationFrame(checkScroll);
      return true;
    };

    if (!selectedElement || !restoreSelectedScroll()) {
      restoreScrollFrameRef.current = requestAnimationFrame(() => {
        restoreScrollFrameRef.current = null;
        restoreSelectedScroll();
      });
    }

    return () => {
      if (restoreScrollFrameRef.current !== null) {
        cancelAnimationFrame(restoreScrollFrameRef.current);
        restoreScrollFrameRef.current = null;
      }
    };
  }, [
    checkScroll,
    filteredOptions,
    firstFilteredOptionId,
    filteredOptions.length,
    isOpen,
    optionsContainerRef,
    searchTerm,
    selectedValue,
  ]);

  return {
    scrollState,
    checkScroll,
  };
};
