import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { HoverDetailData } from '@/types/components';
import { useComboboxKeyboardHoverDetailTimer } from './use-combobox-keyboard-hover-detail-timer';
import {
  useComboboxHighlightedOptionAnchor,
  useComboboxOptionElements,
} from './use-combobox-option-elements';
import { useComboboxOptionHover } from './use-combobox-option-hover';
import { useComboboxOptionHoverDetailSync } from './use-combobox-option-hover-detail-sync';
import { useComboboxOptionInteractionResets } from './use-combobox-option-interaction-resets';
import { useComboboxOptionKeyboardNavigation } from './use-combobox-option-keyboard-navigation';
import {
  useComboboxOptionKeyboardScroll,
  type ComboboxVirtualScrollToIndex,
} from './use-combobox-option-keyboard-scroll';

export function useComboboxOptionInteraction<Item>({
  actualOpen,
  canCreate,
  handleCreate,
  hoverDetail,
  isItemDisabled,
  isSameItem,
  itemToHoverDetailData,
  itemToStringLabel,
  itemToStringValue,
  items,
  listRef,
  normalizedInputValue,
  onFetchHoverDetail,
  onFetchHoverDetailError,
  popupContentRef,
  requestSelectedOptionScroll,
  searchable,
  searchInputRef,
  selectedValue,
  setInputValue,
  setIsSearchNavigationFocus,
  virtualScrollToIndexRef,
  visibleItems,
}: {
  actualOpen: boolean;
  canCreate: boolean;
  handleCreate: () => void;
  hoverDetail?: {
    enabled?: boolean;
    delay?: number;
  };
  isItemDisabled: (item: Item) => boolean;
  isSameItem: (item: Item, value: Item) => boolean;
  itemToHoverDetailData?: (item: Item) => Partial<HoverDetailData>;
  itemToStringLabel: (item: Item) => string;
  itemToStringValue: (item: Item) => string;
  items: Item[];
  listRef: RefObject<HTMLDivElement | null>;
  normalizedInputValue: string;
  onFetchHoverDetail?: (id: string) => Promise<HoverDetailData | null>;
  onFetchHoverDetailError?: (error: unknown, id: string) => void;
  popupContentRef: RefObject<HTMLDivElement | null>;
  requestSelectedOptionScroll: () => void;
  searchable: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
  selectedValue: Item | null;
  setInputValue: Dispatch<SetStateAction<string>>;
  setIsSearchNavigationFocus: Dispatch<SetStateAction<boolean>>;
  virtualScrollToIndexRef: RefObject<ComboboxVirtualScrollToIndex | null>;
  visibleItems: Item[];
}) {
  const { getOptionElementAtIndex, isOptionElementFullyVisible } =
    useComboboxOptionElements({ listRef });
  const { clearKeyboardHoverDetailSync, keyboardHoverDetailSyncTimeoutRef } =
    useComboboxKeyboardHoverDetailTimer();
  const keyboardScroll = useComboboxOptionKeyboardScroll({
    actualOpen,
    getOptionElementAtIndex,
    listRef,
    popupContentRef,
    virtualScrollToIndexRef,
    visibleItemCount: visibleItems.length,
  });
  const optionHover = useComboboxOptionHover({
    actualOpen,
    clearKeyboardHoverDetailSync,
    clearKeyboardScrollHighlight: keyboardScroll.clearKeyboardScrollHighlight,
    hoverDetail,
    isItemDisabled,
    itemToHoverDetailData,
    itemToStringLabel,
    itemToStringValue,
    onFetchHoverDetail,
    onFetchHoverDetailError,
    popupContentRef,
    selectedValue,
  });
  const keyboardNavigation = useComboboxOptionKeyboardNavigation({
    actualOpen,
    canCreate,
    clearKeyboardScrollHighlight: keyboardScroll.clearKeyboardScrollHighlight,
    handleCreate,
    hideHoverDetail: optionHover.hideHoverDetail,
    isItemDisabled,
    isKeyboardHoverSuppressed: optionHover.isKeyboardHoverSuppressed,
    isSameItem,
    items,
    normalizedInputValue,
    requestSelectedOptionScroll,
    resetKeyboardHoverSuppression: optionHover.resetKeyboardHoverSuppression,
    scheduleKeyboardHighlightedScroll:
      keyboardScroll.scheduleKeyboardHighlightedScroll,
    searchable,
    searchInputRef,
    selectedValue,
    setInputValue,
    setIsSearchNavigationFocus,
    suppressPointerHoverForKeyboard:
      optionHover.suppressPointerHoverForKeyboard,
    visibleItems,
  });
  const getHighlightedHoverDetailAnchorElement =
    useComboboxHighlightedOptionAnchor({
      getOptionElementAtIndex,
      hasHeldHighlightFrame: keyboardScroll.heldHighlightFrame !== null,
      popupContentRef,
    });
  const scrollHoverDetailSync = useComboboxOptionHoverDetailSync({
    actualOpen,
    cancelPendingHoverDetail: optionHover.cancelPendingHoverDetail,
    clearKeyboardHoverDetailSync,
    effectiveHighlightedIndex: keyboardNavigation.effectiveHighlightedIndex,
    getHighlightedHoverDetailAnchorElement,
    getItemHoverDetailData: optionHover.getItemHoverDetailData,
    getOptionElementAtIndex,
    handleListMouseLeave: optionHover.handleListMouseLeave,
    hideHoverDetail: optionHover.hideHoverDetail,
    hoverDetailEnabled: optionHover.hoverDetailEnabled,
    isHoverDetailVisible: optionHover.isHoverDetailVisible,
    isItemDisabled,
    isKeyboardHoverSuppressed: optionHover.isKeyboardHoverSuppressed,
    isOptionElementFullyVisible,
    itemToStringValue,
    keyboardHoverDetailSyncTimeoutRef,
    listRef,
    syncHighlightedHoverDetail: optionHover.syncHighlightedHoverDetail,
    visibleItems,
  });
  const resets = useComboboxOptionInteractionResets({
    cancelPendingHoverDetail: optionHover.cancelPendingHoverDetail,
    clearKeyboardHoverDetailSync,
    hideHoverDetail: optionHover.hideHoverDetail,
    resetKeyboardHoverSuppression: optionHover.resetKeyboardHoverSuppression,
    resetPointerHoverState: optionHover.resetPointerHoverState,
    resetScrollHoverDetailState:
      scrollHoverDetailSync.resetScrollHoverDetailState,
    setInputValue,
    setIsSearchNavigationFocus,
  });

  return {
    effectiveHighlightedIndex: keyboardNavigation.effectiveHighlightedIndex,
    handleInputValueChange: keyboardNavigation.handleInputValueChange,
    handleItemHighlighted: keyboardNavigation.handleItemHighlighted,
    handleItemLeave: optionHover.handleItemLeave,
    handleListScroll: scrollHoverDetailSync.handleListScroll,
    handleOptionListMouseLeave:
      scrollHoverDetailSync.handleOptionListMouseLeave,
    handleOptionMouseEnter: optionHover.handleOptionMouseEnter,
    handleOptionMouseMove: optionHover.handleOptionMouseMove,
    handleSearchInputKeyDown: keyboardNavigation.handleSearchInputKeyDown,
    handleTriggerKeyDown: keyboardNavigation.handleTriggerKeyDown,
    handleTriggerMouseEnter: optionHover.handleTriggerMouseEnter,
    handleTriggerMouseLeave: optionHover.handleTriggerMouseLeave,
    heldHighlightFrame: keyboardScroll.heldHighlightFrame,
    heldHighlightFrameKey: keyboardScroll.heldHighlightFrameKey,
    hoverDetail: optionHover.hoverDetail,
    resetAfterValueChange: resets.resetAfterValueChange,
    resetOnClose: resets.resetOnClose,
    resetOnOpen: resets.resetOnOpen,
  };
}
