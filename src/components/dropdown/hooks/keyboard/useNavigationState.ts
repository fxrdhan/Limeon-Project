import { useState, useCallback, RefObject } from 'react';
import { DROPDOWN_CONSTANTS } from '../../constants';

interface UseNavigationStateProps {
  isOpen: boolean;
  currentFilteredOptions: Array<{ id: string; name: string }>;
  setExpandedId: (id: string | null) => void;
  optionsContainerRef: RefObject<HTMLDivElement | null>;
}

export const useNavigationState = ({
  isOpen,
  currentFilteredOptions,
  setExpandedId,
  optionsContainerRef,
}: UseNavigationStateProps) => {
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);

  const handleNavigate = useCallback((
    direction: 'up' | 'down' | 'pageUp' | 'pageDown' | 'tab',
    shiftKey?: boolean
  ) => {
    const items = currentFilteredOptions;
    let newIndex = highlightedIndex;

    switch (direction) {
      case 'down':
        newIndex = items.length ? (highlightedIndex + 1) % items.length : -1;
        break;
      case 'up':
        newIndex = items.length
          ? (highlightedIndex - 1 + items.length) % items.length
          : -1;
        break;
      case 'tab':
        if (items.length) {
          newIndex = shiftKey
            ? highlightedIndex <= 0
              ? items.length - 1
              : highlightedIndex - 1
            : highlightedIndex >= items.length - 1
              ? 0
              : highlightedIndex + 1;
        }
        break;
      case 'pageDown':
        if (items.length) {
          newIndex = Math.min(
            highlightedIndex === -1 ? DROPDOWN_CONSTANTS.PAGE_SIZE - 1 : highlightedIndex + DROPDOWN_CONSTANTS.PAGE_SIZE,
            items.length - 1,
          );
        }
        break;
      case 'pageUp':
        if (items.length) {
          newIndex =
            highlightedIndex === -1 ? 0 : Math.max(highlightedIndex - DROPDOWN_CONSTANTS.PAGE_SIZE, 0);
        }
        break;
    }

    setIsKeyboardNavigation(true);
    setExpandedId(null);
    setHighlightedIndex(newIndex);
    
    if (newIndex >= 0 && items[newIndex]) {
      setExpandedId(items[newIndex].id);
    }
  }, [highlightedIndex, currentFilteredOptions, setExpandedId]);

  const scrollToHighlightedOption = useCallback(() => {
    if (isOpen && highlightedIndex >= 0 && optionsContainerRef.current) {
      const optionElements = optionsContainerRef.current.querySelectorAll('[role="option"]');
      if (optionElements[highlightedIndex]) {
        if (highlightedIndex === 0) {
          optionsContainerRef.current.scrollTop = 0;
        } else if (highlightedIndex === currentFilteredOptions.length - 1) {
          optionsContainerRef.current.scrollTop = optionsContainerRef.current.scrollHeight;
        } else {
          (optionElements[highlightedIndex] as HTMLElement).scrollIntoView({
            block: 'nearest',
            behavior: 'auto',
          });
        }
      }
    }
  }, [highlightedIndex, isOpen, currentFilteredOptions, optionsContainerRef]);

  const handleEscape = useCallback(() => {
    setExpandedId(null);
  }, [setExpandedId]);

  const handleEnter = useCallback(() => {
    // Enter handling is managed by the parent
  }, []);

  return {
    highlightedIndex,
    isKeyboardNavigation,
    setHighlightedIndex,
    setIsKeyboardNavigation,
    handleNavigate,
    scrollToHighlightedOption,
    handleEscape,
    handleEnter,
  };
};