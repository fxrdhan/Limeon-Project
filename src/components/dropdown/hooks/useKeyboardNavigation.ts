import { RefObject, useState, useCallback, useEffect, useRef } from "react";
import { KEYBOARD_KEYS, DROPDOWN_CONSTANTS, SEARCH_STATES } from "../constants";

interface UseKeyboardNavigationProps {
  isOpen: boolean;
  value?: string;
  currentFilteredOptions: Array<{ id: string; name: string }>;
  setExpandedId: (id: string | null) => void;
  searchState: string;
  searchTerm: string;
  onSelect: (optionId: string) => void;
  onAddNew?: (term: string) => void;
  onCloseDropdown: () => void;
  onCloseValidation: () => void;
  autoHighlightOnOpen?: boolean;
  optionsContainerRef: RefObject<HTMLDivElement>;
}

export const useKeyboardNavigation = ({
  isOpen,
  value,
  currentFilteredOptions,
  setExpandedId,
  searchState,
  searchTerm,
  onSelect,
  onAddNew,
  onCloseDropdown,
  onCloseValidation,
  autoHighlightOnOpen = true,
  optionsContainerRef,
}: UseKeyboardNavigationProps) => {
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);
  const [pendingHighlightedIndex, setPendingHighlightedIndex] = useState<number | null>(null);
  const [pendingHighlightSourceIndex, setPendingHighlightSourceIndex] = useState<number | null>(
    null,
  );

  // Track mouse movement to exit keyboard mode
  const mouseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingHighlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keyboardHighlightIndexRef = useRef<number | null>(null);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });

  const clearPendingHighlight = useCallback(() => {
    if (pendingHighlightTimeoutRef.current) {
      clearTimeout(pendingHighlightTimeoutRef.current);
      pendingHighlightTimeoutRef.current = null;
    }
    keyboardHighlightIndexRef.current = null;
    setPendingHighlightedIndex(null);
    setPendingHighlightSourceIndex(null);
  }, []);

  const setHighlightedIndexSafely = useCallback(
    (index: number) => {
      clearPendingHighlight();
      setHighlightedIndex(index);
    },
    [clearPendingHighlight],
  );

  const getRequiredScrollTop = useCallback(
    (index: number): number | null => {
      const container = optionsContainerRef.current;
      const optionElement = container?.querySelectorAll<HTMLElement>('[role="option"]')[index];

      if (!container || !optionElement) return null;

      const itemTop = optionElement.offsetTop;
      const itemBottom = itemTop + optionElement.offsetHeight;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const visibilityInset = 4;

      if (itemTop < containerScrollTop + visibilityInset) {
        return Math.max(0, itemTop - visibilityInset);
      }

      if (itemBottom > containerScrollTop + containerHeight - visibilityInset) {
        return index === currentFilteredOptions.length - 1
          ? container.scrollHeight - containerHeight
          : itemBottom - containerHeight + visibilityInset;
      }

      return null;
    },
    [currentFilteredOptions.length, optionsContainerRef],
  );

  useEffect(() => {
    if (!isOpen) {
      clearPendingHighlight();
      if (highlightedIndex !== -1 || isKeyboardNavigation) {
        queueMicrotask(() => {
          if (highlightedIndex !== -1) {
            setHighlightedIndex(-1);
          }
          if (isKeyboardNavigation) {
            setIsKeyboardNavigation(false);
          }
        });
      }
    } else if (
      currentFilteredOptions.length > 0 &&
      !isKeyboardNavigation &&
      highlightedIndex === -1 &&
      autoHighlightOnOpen
    ) {
      queueMicrotask(() => {
        if (value) {
          const selectedIndex = currentFilteredOptions.findIndex((option) => option.id === value);
          if (selectedIndex >= 0) {
            if (selectedIndex !== highlightedIndex) {
              setHighlightedIndex(selectedIndex);
            }
            setExpandedId(currentFilteredOptions[selectedIndex].id);
          }
        } else {
          setHighlightedIndex(0);
          setExpandedId(currentFilteredOptions[0].id);
        }
      });
    }
  }, [
    isOpen,
    currentFilteredOptions,
    value,
    setExpandedId,
    isKeyboardNavigation,
    highlightedIndex,
    autoHighlightOnOpen,
    clearPendingHighlight,
  ]);

  useEffect(() => {
    return () => {
      clearPendingHighlight();
    };
  }, [clearPendingHighlight]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = { x: e.clientX, y: e.clientY };
      const lastPos = lastMousePositionRef.current;

      const mouseMoved =
        Math.abs(currentPos.x - lastPos.x) > 5 || Math.abs(currentPos.y - lastPos.y) > 5;

      if (mouseMoved && isKeyboardNavigation) {
        if (mouseTimeoutRef.current) {
          clearTimeout(mouseTimeoutRef.current);
        }

        mouseTimeoutRef.current = setTimeout(() => {
          setIsKeyboardNavigation(false);
        }, 50);
      }

      lastMousePositionRef.current = currentPos;
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      if (mouseTimeoutRef.current) {
        clearTimeout(mouseTimeoutRef.current);
      }
    };
  }, [isOpen, isKeyboardNavigation]);

  const handleDropdownKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!isOpen) return;

      const items = currentFilteredOptions;
      if (
        !items.length &&
        !([KEYBOARD_KEYS.ESCAPE, KEYBOARD_KEYS.TAB, KEYBOARD_KEYS.ENTER] as string[]).includes(
          e.key,
        )
      )
        return;

      let newIndex = highlightedIndex;
      const navigationBaseIndex = keyboardHighlightIndexRef.current ?? highlightedIndex;
      const keyActions: Record<string, () => void> = {
        [KEYBOARD_KEYS.ARROW_DOWN]: () => {
          newIndex = items.length ? (navigationBaseIndex + 1) % items.length : -1;
        },
        [KEYBOARD_KEYS.ARROW_UP]: () => {
          newIndex = items.length ? (navigationBaseIndex - 1 + items.length) % items.length : -1;
        },
        [KEYBOARD_KEYS.TAB]: () => {
          if (items.length) {
            newIndex = e.shiftKey
              ? navigationBaseIndex <= 0
                ? items.length - 1
                : navigationBaseIndex - 1
              : navigationBaseIndex >= items.length - 1
                ? 0
                : navigationBaseIndex + 1;
          }
        },
        [KEYBOARD_KEYS.PAGE_DOWN]: () => {
          if (items.length) {
            newIndex = Math.min(
              navigationBaseIndex === -1
                ? DROPDOWN_CONSTANTS.PAGE_SIZE - 1
                : navigationBaseIndex + DROPDOWN_CONSTANTS.PAGE_SIZE,
              items.length - 1,
            );
          }
        },
        [KEYBOARD_KEYS.PAGE_UP]: () => {
          if (items.length) {
            newIndex =
              navigationBaseIndex === -1
                ? 0
                : Math.max(navigationBaseIndex - DROPDOWN_CONSTANTS.PAGE_SIZE, 0);
          }
        },
        [KEYBOARD_KEYS.ENTER]: () => {
          if (highlightedIndex >= 0 && highlightedIndex < items.length) {
            onSelect(items[highlightedIndex].id);
          } else if (
            (searchState === SEARCH_STATES.NOT_FOUND ||
              (searchState === SEARCH_STATES.TYPING && currentFilteredOptions.length === 0)) &&
            onAddNew &&
            searchTerm.trim() !== ""
          ) {
            onCloseValidation();
            onAddNew(searchTerm);
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
        if (!([KEYBOARD_KEYS.ENTER, KEYBOARD_KEYS.ESCAPE] as string[]).includes(e.key)) {
          setIsKeyboardNavigation(true);
          setExpandedId(null);
        }
        keyActions[e.key]();
        if (!([KEYBOARD_KEYS.ENTER, KEYBOARD_KEYS.ESCAPE] as string[]).includes(e.key)) {
          const shouldPinHighlight = newIndex >= 0 && getRequiredScrollTop(newIndex) !== null;

          if (shouldPinHighlight) {
            if (pendingHighlightTimeoutRef.current) {
              clearTimeout(pendingHighlightTimeoutRef.current);
            }
            const sourceIndex = keyboardHighlightIndexRef.current ?? highlightedIndex;
            keyboardHighlightIndexRef.current = newIndex;
            setPendingHighlightSourceIndex(sourceIndex);
            setPendingHighlightedIndex(newIndex);
            setHighlightedIndex(newIndex);
            if (newIndex >= 0 && items[newIndex]) {
              setExpandedId(items[newIndex].id);
            }
            pendingHighlightTimeoutRef.current = setTimeout(() => {
              setPendingHighlightedIndex(null);
              keyboardHighlightIndexRef.current = null;
              pendingHighlightTimeoutRef.current = null;
            }, 260);
            return;
          }

          clearPendingHighlight();
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
      getRequiredScrollTop,
      clearPendingHighlight,
    ],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      handleDropdownKeyDown(e);
    },
    [handleDropdownKeyDown],
  );

  return {
    highlightedIndex,
    setHighlightedIndex: setHighlightedIndexSafely,
    isKeyboardNavigation,
    setIsKeyboardNavigation,
    pendingHighlightedIndex,
    pendingHighlightSourceIndex,
    handleDropdownKeyDown,
    handleKeyDown,
  };
};
