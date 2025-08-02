import { useCallback } from 'react';
import { KEYBOARD_KEYS, SEARCH_STATES } from '../../constants';

interface UseKeyboardEventsProps {
  isOpen: boolean;
  currentFilteredOptions: Array<{ id: string; name: string }>;
  highlightedIndex: number;
  searchState: string;
  searchTerm: string;
  onSelect: (optionId: string) => void;
  onAddNew?: (term: string) => void;
  onCloseDropdown: () => void;
  onCloseValidation: () => void;
  onNavigate: (
    direction: 'up' | 'down' | 'pageUp' | 'pageDown' | 'tab',
    shiftKey?: boolean
  ) => void;
  onEscape: () => void;
  onEnter: () => void;
}

export const useKeyboardEvents = ({
  isOpen,
  currentFilteredOptions,
  highlightedIndex,
  searchState,
  searchTerm,
  onSelect,
  onAddNew,
  onCloseDropdown,
  onCloseValidation,
  onNavigate,
  onEscape,
  onEnter,
}: UseKeyboardEventsProps) => {
  const handleKeyDown = useCallback(
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

      const keyActions: Record<string, () => void> = {
        [KEYBOARD_KEYS.ARROW_DOWN]: () => onNavigate('down'),
        [KEYBOARD_KEYS.ARROW_UP]: () => onNavigate('up'),
        [KEYBOARD_KEYS.TAB]: () => onNavigate('tab', e.shiftKey),
        [KEYBOARD_KEYS.PAGE_DOWN]: () => onNavigate('pageDown'),
        [KEYBOARD_KEYS.PAGE_UP]: () => onNavigate('pageUp'),
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
          onEnter();
        },
        [KEYBOARD_KEYS.ESCAPE]: () => {
          onCloseDropdown();
          onEscape();
        },
      };

      if (keyActions[e.key]) {
        e.preventDefault();
        keyActions[e.key]();
      }
    },
    [
      isOpen,
      currentFilteredOptions,
      highlightedIndex,
      onSelect,
      onAddNew,
      onCloseDropdown,
      onCloseValidation,
      searchState,
      searchTerm,
      onNavigate,
      onEscape,
      onEnter,
    ]
  );

  return {
    handleKeyDown,
  };
};
