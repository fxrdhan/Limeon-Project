import { useState, useCallback, useEffect, RefObject } from 'react';
import { KEYBOARD_KEYS, DROPDOWN_CONSTANTS, SEARCH_STATES } from '../constants';

interface UseKeyboardNavigationProps {
  isOpen: boolean;
  currentFilteredOptions: Array<{ id: string; name: string }>;
  setExpandedId: (id: string | null) => void;
  searchState: string;
  searchTerm: string;
  onSelect: (optionId: string) => void;
  onAddNew?: (term: string) => void;
  onCloseDropdown: () => void;
  onCloseValidation: () => void;
  optionsContainerRef: RefObject<HTMLDivElement | null>;
}

export const useKeyboardNavigation = ({
  isOpen,
  currentFilteredOptions,
  setExpandedId,
  searchState,
  searchTerm,
  onSelect,
  onAddNew,
  onCloseDropdown,
  onCloseValidation,
  optionsContainerRef,
}: UseKeyboardNavigationProps) => {
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);

  // Reset highlighted index when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
      setIsKeyboardNavigation(false);
    }
  }, [isOpen]);

  const handleDropdownKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!isOpen) return;

      const items = currentFilteredOptions;
      if (
        !items.length &&
        !(
          [
            KEYBOARD_KEYS.ESCAPE,
            KEYBOARD_KEYS.TAB,
            KEYBOARD_KEYS.ENTER,
          ] as string[]
        ).includes(e.key)
      )
        return;

      let newIndex = highlightedIndex;
      const keyActions: Record<string, () => void> = {
        [KEYBOARD_KEYS.ARROW_DOWN]: () => {
          newIndex = items.length ? (highlightedIndex + 1) % items.length : -1;
        },
        [KEYBOARD_KEYS.ARROW_UP]: () => {
          newIndex = items.length
            ? (highlightedIndex - 1 + items.length) % items.length
            : -1;
        },
        [KEYBOARD_KEYS.TAB]: () => {
          if (items.length) {
            newIndex = e.shiftKey
              ? highlightedIndex <= 0
                ? items.length - 1
                : highlightedIndex - 1
              : highlightedIndex >= items.length - 1
                ? 0
                : highlightedIndex + 1;
          }
        },
        [KEYBOARD_KEYS.PAGE_DOWN]: () => {
          if (items.length) {
            newIndex = Math.min(
              highlightedIndex === -1
                ? DROPDOWN_CONSTANTS.PAGE_SIZE - 1
                : highlightedIndex + DROPDOWN_CONSTANTS.PAGE_SIZE,
              items.length - 1
            );
          }
        },
        [KEYBOARD_KEYS.PAGE_UP]: () => {
          if (items.length) {
            newIndex =
              highlightedIndex === -1
                ? 0
                : Math.max(highlightedIndex - DROPDOWN_CONSTANTS.PAGE_SIZE, 0);
          }
        },
        [KEYBOARD_KEYS.ENTER]: () => {
          if (highlightedIndex >= 0 && highlightedIndex < items.length) {
            onSelect(items[highlightedIndex].id);
          } else if (
            (searchState === SEARCH_STATES.NOT_FOUND ||
              (searchState === SEARCH_STATES.TYPING &&
                currentFilteredOptions.length === 0)) &&
            onAddNew &&
            searchTerm.trim() !== ''
          ) {
            onCloseValidation();
            onAddNew(searchTerm);
            onCloseDropdown();
          }
          return;
        },
        [KEYBOARD_KEYS.ESCAPE]: () => {
          onCloseDropdown();
          setExpandedId(null);
          return;
        },
      };

      if (keyActions[e.key]) {
        e.preventDefault();
        if (
          !([KEYBOARD_KEYS.ENTER, KEYBOARD_KEYS.ESCAPE] as string[]).includes(
            e.key
          )
        ) {
          setIsKeyboardNavigation(true);
          setExpandedId(null);
        }
        keyActions[e.key]();
        if (
          !([KEYBOARD_KEYS.ENTER, KEYBOARD_KEYS.ESCAPE] as string[]).includes(
            e.key
          )
        ) {
          setHighlightedIndex(newIndex);
          if (newIndex >= 0 && items[newIndex]) {
            setExpandedId(items[newIndex].id);
          }
        }
      }
    },
    [
      isOpen,
      currentFilteredOptions,
      highlightedIndex,
      onSelect,
      onCloseDropdown,
      onAddNew,
      searchState,
      searchTerm,
      onCloseValidation,
      setHighlightedIndex,
      setExpandedId,
    ]
  );

  const scrollToHighlightedOption = useCallback(() => {
    if (isOpen && highlightedIndex >= 0 && optionsContainerRef.current) {
      const optionElements =
        optionsContainerRef.current.querySelectorAll('[role="option"]');
      if (optionElements[highlightedIndex]) {
        if (highlightedIndex === 0) {
          optionsContainerRef.current.scrollTop = 0;
        } else if (highlightedIndex === currentFilteredOptions.length - 1) {
          optionsContainerRef.current.scrollTop =
            optionsContainerRef.current.scrollHeight;
        } else {
          (optionElements[highlightedIndex] as HTMLElement).scrollIntoView({
            block: 'nearest',
            behavior: 'auto',
          });
        }
      }
    }
  }, [highlightedIndex, isOpen, currentFilteredOptions, optionsContainerRef]);

  // Simple wrapper for external components that just need basic key handling
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    handleDropdownKeyDown(e);
  }, [handleDropdownKeyDown]);

  return {
    highlightedIndex,
    setHighlightedIndex,
    isKeyboardNavigation,
    setIsKeyboardNavigation,
    handleDropdownKeyDown,
    handleKeyDown, // Alias for backward compatibility
    scrollToHighlightedOption,
  };
};
