import { useState, useCallback, useEffect, RefObject, useRef } from 'react';
import { KEYBOARD_KEYS, DROPDOWN_CONSTANTS, SEARCH_STATES } from '../constants';

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
  optionsContainerRef: RefObject<HTMLDivElement | null>;
  autoHighlightOnOpen?: boolean;
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
  optionsContainerRef,
  autoHighlightOnOpen = true,
}: UseKeyboardNavigationProps) => {
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);

  // Track mouse movement to exit keyboard mode
  const mouseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isOpen) {
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

          requestAnimationFrame(() => {
            if (optionsContainerRef.current && newIndex >= 0) {
              const optionElements =
                optionsContainerRef.current.querySelectorAll('[role="option"]');
              if (optionElements[newIndex]) {
                (optionElements[newIndex] as HTMLElement).scrollIntoView({
                  block: 'nearest',
                  behavior: 'auto',
                });
              }
            }
          });
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
      optionsContainerRef,
    ]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>) => {
      handleDropdownKeyDown(e);
    },
    [handleDropdownKeyDown]
  );

  return {
    highlightedIndex,
    setHighlightedIndex,
    isKeyboardNavigation,
    setIsKeyboardNavigation,
    handleDropdownKeyDown,
    handleKeyDown,
  };
};
