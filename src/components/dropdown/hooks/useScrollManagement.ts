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
  debouncedSearchTerm: string;
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

const getOptionFrameAtIndex = (container: HTMLDivElement, index: number) =>
  container.querySelector<HTMLElement>(
    `[data-dropdown-option-frame][data-dropdown-option-index="${index}"]`
  );

const scrollEstimatedOptionToPinnedTop = (
  container: HTMLDivElement,
  index: number,
  itemCount: number
) => {
  const containerHeight = container.clientHeight;
  const estimatedTotalHeight =
    itemCount * DROPDOWN_CONSTANTS.OPTION_ESTIMATED_HEIGHT;
  const maxScrollTop = Math.max(0, estimatedTotalHeight - containerHeight);
  const padding = 6;
  const targetScrollTop = Math.min(
    maxScrollTop,
    Math.max(0, index * DROPDOWN_CONSTANTS.OPTION_ESTIMATED_HEIGHT - padding)
  );
  container.scrollTop = targetScrollTop;
};

export const useScrollManagement = ({
  isOpen,
  filteredOptions,
  searchTerm,
  debouncedSearchTerm,
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
    const highlightedOption =
      Array.from(optionElements).find(
        el => el.getAttribute('aria-selected') === 'true'
      ) ||
      Array.from(optionElements).find(
        el =>
          el.classList.contains('bg-slate-100') ||
          el.classList.contains('bg-slate-300/50') ||
          el.classList.contains('bg-slate-300/30')
      );
    const highlightedElement =
      highlightedOption?.closest<HTMLElement>('[data-dropdown-option-frame]') ??
      null;

    if (highlightedElement) {
      scrollElementToPinnedTop(container, highlightedElement as HTMLElement);
    } else if (selectedValue) {
      const selectedIndex = filteredOptions.findIndex(
        option => option.id === selectedValue
      );

      if (selectedIndex >= 0) {
        scrollEstimatedOptionToPinnedTop(
          container,
          selectedIndex,
          filteredOptions.length
        );
      }
    }
    requestAnimationFrame(() => {
      setHasInitialScrolled(true);
    });
  }, [
    autoScrollOnOpen,
    isOpen,
    hasInitialScrolled,
    filteredOptions,
    optionsContainerRef,
    selectedValue,
  ]);

  const firstFilteredOptionId = filteredOptions[0]?.id;

  useLayoutEffect(() => {
    if (restoreScrollFrameRef.current !== null) {
      cancelAnimationFrame(restoreScrollFrameRef.current);
      restoreScrollFrameRef.current = null;
    }

    if (!isOpen) return;
    if (!optionsContainerRef.current) return;

    const hasVisibleSearchResults = debouncedSearchTerm.trim() !== '';
    const container = optionsContainerRef.current;

    if (hasVisibleSearchResults) {
      shouldRestoreScrollAfterSearchClearRef.current = true;
      container.scrollTop = 0;
      requestAnimationFrame(checkScroll);
      return;
    }

    if (searchTerm.trim() !== '') {
      shouldRestoreScrollAfterSearchClearRef.current = true;
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

    const selectedElement = getOptionFrameAtIndex(container, selectedIndex);

    const restoreSelectedScroll = () => {
      const currentContainer = optionsContainerRef.current;
      if (!currentContainer) return false;

      const currentSelectedElement = getOptionFrameAtIndex(
        currentContainer,
        selectedIndex
      );

      if (!currentSelectedElement) {
        scrollEstimatedOptionToPinnedTop(
          currentContainer,
          selectedIndex,
          filteredOptions.length
        );
        shouldRestoreScrollAfterSearchClearRef.current = false;
        requestAnimationFrame(checkScroll);
        return true;
      }

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
    debouncedSearchTerm,
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
