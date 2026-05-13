import { type Dispatch, type RefObject, type SetStateAction } from 'react';
import { useComboboxHighlight } from './use-combobox-highlight';

export function useComboboxOptionKeyboardNavigation<Item>({
  actualOpen,
  canCreate,
  clearKeyboardScrollHighlight,
  handleCreate,
  hideHoverDetail,
  isItemDisabled,
  isKeyboardHoverSuppressed,
  isSameItem,
  items,
  normalizedInputValue,
  requestSelectedOptionScroll,
  resetKeyboardHoverSuppression,
  scheduleKeyboardHighlightedScroll,
  searchable,
  searchInputRef,
  selectedValue,
  setInputValue,
  setIsSearchNavigationFocus,
  suppressPointerHoverForKeyboard,
  visibleItems,
}: {
  actualOpen: boolean;
  canCreate: boolean;
  clearKeyboardScrollHighlight: () => void;
  handleCreate: () => void;
  hideHoverDetail: () => void;
  isItemDisabled: (item: Item) => boolean;
  isKeyboardHoverSuppressed: () => boolean;
  isSameItem: (item: Item, value: Item) => boolean;
  items: Item[];
  normalizedInputValue: string;
  requestSelectedOptionScroll: () => void;
  resetKeyboardHoverSuppression: () => void;
  scheduleKeyboardHighlightedScroll: (
    targetVisibleIndex: number,
    sourceVisibleIndex: number | null
  ) => void;
  searchable: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  selectedValue: Item | null;
  setInputValue: Dispatch<SetStateAction<string>>;
  setIsSearchNavigationFocus: Dispatch<SetStateAction<boolean>>;
  suppressPointerHoverForKeyboard: () => void;
  visibleItems: Item[];
}) {
  return useComboboxHighlight({
    actualOpen,
    canCreate,
    clearKeyboardScrollHighlight,
    handleCreate,
    hideHoverDetail,
    isItemDisabled,
    isKeyboardHoverSuppressed,
    isSameItem,
    items,
    normalizedInputValue,
    requestSelectedOptionScroll,
    resetKeyboardHoverSuppression,
    scheduleKeyboardHighlightedScroll,
    searchable,
    searchInputRef,
    selectedValue,
    setInputValue,
    setIsSearchNavigationFocus,
    suppressPointerHoverForKeyboard,
    visibleItems,
  });
}
