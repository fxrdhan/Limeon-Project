import {
  RefObject,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from 'react';
import {
  getKeyboardScrollTarget,
  KEYBOARD_SCROLL_VISIBILITY_INSET,
} from '@/components/shared/keyboard-pinned-highlight';
import { KEYBOARD_KEYS, COMBOBOX_CONSTANTS, SEARCH_STATES } from '../constants';

interface UseKeyboardNavigationProps {
  isOpen: boolean;
  value?: string;
  currentFilteredOptions: Array<{ id: string; name: string }>;
  setExpandedId: (id: string | null) => void;
  searchState: string;
  searchTerm: string;
  debouncedSearchTerm: string;
  onSelect: (optionId: string) => void;
  onAddNew?: (term: string) => void;
  onCloseCombobox: () => void;
  onCloseValidation: () => void;
  autoHighlightOnOpen?: boolean;
  optionsContainerRef: RefObject<HTMLDivElement>;
}

const getOptionFrameAtIndex = (container: HTMLDivElement, index: number) =>
  container.querySelector<HTMLElement>(
    `[data-dropdown-option-frame][data-dropdown-option-index="${index}"]`
  );

const getEstimatedScrollTopForIndex = ({
  container,
  index,
  itemCount,
}: {
  container: HTMLDivElement;
  index: number;
  itemCount: number;
}) => {
  const itemTop = index * COMBOBOX_CONSTANTS.OPTION_ESTIMATED_HEIGHT;
  const itemBottom = itemTop + COMBOBOX_CONSTANTS.OPTION_ESTIMATED_HEIGHT;
  const containerHeight = container.clientHeight;

  if (itemTop < container.scrollTop + KEYBOARD_SCROLL_VISIBILITY_INSET) {
    return Math.max(0, itemTop - KEYBOARD_SCROLL_VISIBILITY_INSET);
  }

  if (
    itemBottom >
    container.scrollTop + containerHeight - KEYBOARD_SCROLL_VISIBILITY_INSET
  ) {
    return Math.max(
      0,
      index === itemCount - 1
        ? itemCount * COMBOBOX_CONSTANTS.OPTION_ESTIMATED_HEIGHT -
            containerHeight
        : itemBottom - containerHeight + KEYBOARD_SCROLL_VISIBILITY_INSET
    );
  }

  return null;
};

export const useKeyboardNavigation = ({
  isOpen,
  value,
  currentFilteredOptions,
  setExpandedId,
  searchState,
  searchTerm,
  debouncedSearchTerm,
  onSelect,
  onAddNew,
  onCloseCombobox,
  onCloseValidation,
  autoHighlightOnOpen = true,
  optionsContainerRef,
}: UseKeyboardNavigationProps) => {
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);
  const [pendingHighlightedIndex, setPendingHighlightedIndex] = useState<
    number | null
  >(null);
  const [pendingHighlightSourceIndex, setPendingHighlightSourceIndex] =
    useState<number | null>(null);

  // Track mouse movement to exit keyboard mode
  const mouseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingHighlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const keyboardHighlightIndexRef = useRef<number | null>(null);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });
  const shouldRestoreHighlightAfterSearchClearRef = useRef(false);

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
    [clearPendingHighlight]
  );

  const getRequiredScrollTop = useCallback(
    (index: number): number | null => {
      const container = optionsContainerRef.current;
      if (!container) return null;

      const optionElement = getOptionFrameAtIndex(container, index);
      if (!optionElement) {
        return getEstimatedScrollTopForIndex({
          container,
          index,
          itemCount: currentFilteredOptions.length,
        });
      }

      return (
        getKeyboardScrollTarget({
          container,
          itemCount: currentFilteredOptions.length,
          targetElement: optionElement,
          targetIndex: index,
        })?.scrollTop ?? null
      );
    },
    [currentFilteredOptions.length, optionsContainerRef]
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
          const selectedIndex = currentFilteredOptions.findIndex(
            option => option.id === value
          );
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

  useLayoutEffect(() => {
    if (!isOpen || isKeyboardNavigation) return;

    const hasVisibleSearchResults = debouncedSearchTerm.trim() !== '';

    if (hasVisibleSearchResults || searchTerm.trim() !== '') {
      shouldRestoreHighlightAfterSearchClearRef.current = true;
    } else if (!shouldRestoreHighlightAfterSearchClearRef.current) {
      return;
    }

    clearPendingHighlight();

    if (currentFilteredOptions.length === 0) {
      if (highlightedIndex !== -1) {
        setHighlightedIndex(-1);
      }
      setExpandedId(null);
      return;
    }

    const nextHighlightedIndex = hasVisibleSearchResults
      ? 0
      : value
        ? currentFilteredOptions.findIndex(option => option.id === value)
        : 0;

    if (!hasVisibleSearchResults && value && nextHighlightedIndex < 0) {
      return;
    }

    const normalizedHighlightedIndex =
      nextHighlightedIndex >= 0 ? nextHighlightedIndex : 0;

    if (highlightedIndex !== normalizedHighlightedIndex) {
      setHighlightedIndex(normalizedHighlightedIndex);
    }
    setExpandedId(currentFilteredOptions[normalizedHighlightedIndex].id);

    if (!hasVisibleSearchResults) {
      shouldRestoreHighlightAfterSearchClearRef.current = false;
    }
  }, [
    clearPendingHighlight,
    currentFilteredOptions,
    debouncedSearchTerm,
    highlightedIndex,
    isKeyboardNavigation,
    isOpen,
    searchTerm,
    setExpandedId,
    value,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = { x: e.clientX, y: e.clientY };
      const lastPos = lastMousePositionRef.current;

      const mouseMoved =
        Math.abs(currentPos.x - lastPos.x) > 5 ||
        Math.abs(currentPos.y - lastPos.y) > 5;

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

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      if (mouseTimeoutRef.current) {
        clearTimeout(mouseTimeoutRef.current);
      }
    };
  }, [isOpen, isKeyboardNavigation]);

  const handleComboboxKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      if (!isOpen) return;

      if (e.key === KEYBOARD_KEYS.TAB) {
        clearPendingHighlight();
        onCloseCombobox();
        setExpandedId(null);
        setIsKeyboardNavigation(false);
        return;
      }

      const items = currentFilteredOptions;
      if (
        !items.length &&
        !([KEYBOARD_KEYS.ESCAPE, KEYBOARD_KEYS.ENTER] as string[]).includes(
          e.key
        )
      )
        return;

      let newIndex = highlightedIndex;
      const selectedIndex =
        value && items.length
          ? items.findIndex(option => option.id === value)
          : -1;
      const navigationBaseIndex =
        keyboardHighlightIndexRef.current ??
        (highlightedIndex >= 0 ? highlightedIndex : selectedIndex);
      const keyActions: Record<string, () => void> = {
        [KEYBOARD_KEYS.ARROW_DOWN]: () => {
          newIndex = items.length
            ? (navigationBaseIndex + 1) % items.length
            : -1;
        },
        [KEYBOARD_KEYS.ARROW_UP]: () => {
          newIndex = items.length
            ? (navigationBaseIndex - 1 + items.length) % items.length
            : -1;
        },
        [KEYBOARD_KEYS.PAGE_DOWN]: () => {
          if (items.length) {
            newIndex = Math.min(
              navigationBaseIndex === -1
                ? COMBOBOX_CONSTANTS.PAGE_SIZE - 1
                : navigationBaseIndex + COMBOBOX_CONSTANTS.PAGE_SIZE,
              items.length - 1
            );
          }
        },
        [KEYBOARD_KEYS.PAGE_UP]: () => {
          if (items.length) {
            newIndex =
              navigationBaseIndex === -1
                ? 0
                : Math.max(
                    navigationBaseIndex - COMBOBOX_CONSTANTS.PAGE_SIZE,
                    0
                  );
          }
        },
        [KEYBOARD_KEYS.ENTER]: () => {
          const activeIndex =
            keyboardHighlightIndexRef.current ?? highlightedIndex;
          if (activeIndex >= 0 && activeIndex < items.length) {
            onSelect(items[activeIndex].id);
          } else if (
            (searchState === SEARCH_STATES.NOT_FOUND ||
              (searchState === SEARCH_STATES.TYPING &&
                currentFilteredOptions.length === 0)) &&
            onAddNew &&
            searchTerm.trim() !== ''
          ) {
            onCloseValidation();
            onAddNew(searchTerm);
          }
          return;
        },
        [KEYBOARD_KEYS.ESCAPE]: () => {
          onCloseCombobox();
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
          const shouldPinHighlight =
            newIndex >= 0 && getRequiredScrollTop(newIndex) !== null;

          if (shouldPinHighlight) {
            if (pendingHighlightTimeoutRef.current) {
              clearTimeout(pendingHighlightTimeoutRef.current);
            }
            const sourceIndex =
              keyboardHighlightIndexRef.current ?? highlightedIndex;
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
            }, COMBOBOX_CONSTANTS.KEYBOARD_SCROLL_HIGHLIGHT_MAX_HOLD);
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
      value,
      onSelect,
      onCloseCombobox,
      onAddNew,
      searchState,
      searchTerm,
      onCloseValidation,
      setHighlightedIndex,
      setExpandedId,
      getRequiredScrollTop,
      clearPendingHighlight,
    ]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      handleComboboxKeyDown(e);
    },
    [handleComboboxKeyDown]
  );

  return {
    highlightedIndex,
    setHighlightedIndex: setHighlightedIndexSafely,
    isKeyboardNavigation,
    setIsKeyboardNavigation,
    pendingHighlightedIndex,
    pendingHighlightSourceIndex,
    handleComboboxKeyDown,
    handleKeyDown,
  };
};
