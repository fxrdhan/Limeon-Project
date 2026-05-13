import {
  useCallback,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { HoverDetailData } from '@/types/components';
import { getPharmaComboboxOptionIndexSelector } from '../utils/preset-dom';
import { useComboboxHighlight } from './use-combobox-highlight';
import { useComboboxHoverDetailController } from './use-combobox-hover-detail-controller';
import { useComboboxKeyboardHoverDetailSync } from './use-combobox-keyboard-hover-detail-sync';
import {
  useComboboxKeyboardHighlightScroll,
  type ComboboxVirtualScrollToIndex,
} from './use-combobox-keyboard-highlight-scroll';
import { useComboboxPointerHover } from './use-combobox-pointer-hover';
import { useComboboxScrollHoverDetailSync } from './use-combobox-scroll-hover-detail-sync';

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
  const keyboardHoverDetailSyncTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const {
    cancelPendingHoverDetail,
    getItemHoverDetailData,
    handleItemHover,
    handleItemLeave,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    hideHoverDetail,
    hoverDetail: hoverDetailState,
    hoverDetailEnabled,
    isHoverDetailVisible,
    syncHighlightedHoverDetail,
  } = useComboboxHoverDetailController({
    actualOpen,
    hoverDetail,
    itemToHoverDetailData,
    itemToStringLabel,
    itemToStringValue,
    onFetchHoverDetail,
    onFetchHoverDetailError,
    popupContentRef,
    selectedValue,
  });
  const clearKeyboardHoverDetailSync = useCallback(() => {
    if (keyboardHoverDetailSyncTimeoutRef.current === null) return;

    clearTimeout(keyboardHoverDetailSyncTimeoutRef.current);
    keyboardHoverDetailSyncTimeoutRef.current = null;
  }, []);
  const getOptionElementAtIndex = useCallback(
    (index: number) => {
      if (!Number.isInteger(index) || index < 0) return null;

      return (
        listRef.current?.querySelector<HTMLElement>(
          getPharmaComboboxOptionIndexSelector(index)
        ) ?? null
      );
    },
    [listRef]
  );
  const {
    clearKeyboardScrollHighlight,
    heldHighlightFrame,
    heldHighlightFrameKey,
    scheduleKeyboardHighlightedScroll,
  } = useComboboxKeyboardHighlightScroll({
    actualOpen,
    getOptionElementAtIndex,
    listRef,
    popupContentRef,
    virtualScrollToIndexRef,
    visibleItemCount: visibleItems.length,
  });
  const getHighlightedHoverDetailAnchorElement = useCallback(
    (index: number) => {
      const pinnedHighlight = heldHighlightFrame
        ? popupContentRef.current?.querySelector<HTMLElement>(
            '[data-pharma-combobox-pinned-highlight]'
          )
        : null;
      if (pinnedHighlight) return pinnedHighlight;

      const optionElement = getOptionElementAtIndex(index);

      return (
        optionElement?.querySelector<HTMLElement>(
          '[data-pharma-combobox-highlight]'
        ) ?? optionElement
      );
    },
    [getOptionElementAtIndex, heldHighlightFrame, popupContentRef]
  );
  const isOptionElementFullyVisible = useCallback(
    (element: HTMLElement) => {
      const list = listRef.current;
      if (!list) return false;

      const listRect = list.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();

      return (
        elementRect.top >= listRect.top && elementRect.bottom <= listRect.bottom
      );
    },
    [listRef]
  );
  const applyPointerHover = useCallback(
    (item: Item, element: HTMLElement) => {
      if (isItemDisabled(item)) return;

      clearKeyboardHoverDetailSync();
      clearKeyboardScrollHighlight();

      if (!hoverDetailEnabled) return;

      handleItemHover(
        itemToStringValue(item),
        element,
        getItemHoverDetailData(item)
      );
    },
    [
      clearKeyboardHoverDetailSync,
      clearKeyboardScrollHighlight,
      getItemHoverDetailData,
      handleItemHover,
      hoverDetailEnabled,
      isItemDisabled,
      itemToStringValue,
    ]
  );
  const {
    handleListMouseLeave,
    handleOptionMouseEnter,
    handleOptionMouseMove,
    isKeyboardHoverSuppressed,
    resetKeyboardHoverSuppression,
    resetPointerHoverState,
    suppressPointerHoverForKeyboard,
  } = useComboboxPointerHover({
    onHoverAllowed: applyPointerHover,
    onLeave: handleItemLeave,
  });
  const {
    effectiveHighlightedIndex,
    handleInputValueChange,
    handleItemHighlighted,
    handleSearchInputKeyDown,
    handleTriggerKeyDown,
  } = useComboboxHighlight({
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
  useComboboxKeyboardHoverDetailSync({
    actualOpen,
    cancelPendingHoverDetail,
    clearKeyboardHoverDetailSync,
    effectiveHighlightedIndex,
    getHighlightedHoverDetailAnchorElement,
    getItemHoverDetailData,
    hoverDetailEnabled,
    isItemDisabled,
    isKeyboardHoverSuppressed,
    itemToStringValue,
    keyboardHoverDetailSyncTimeoutRef,
    syncHighlightedHoverDetail,
    visibleItems,
  });
  const {
    handleListScroll,
    handleOptionListMouseLeave,
    resetScrollHoverDetailState,
  } = useComboboxScrollHoverDetailSync({
    actualOpen,
    cancelPendingHoverDetail,
    clearKeyboardHoverDetailSync,
    effectiveHighlightedIndex,
    getItemHoverDetailData,
    getOptionElementAtIndex,
    handleListMouseLeave,
    hideHoverDetail,
    hoverDetailEnabled,
    isHoverDetailVisible,
    isItemDisabled,
    isKeyboardHoverSuppressed,
    isOptionElementFullyVisible,
    itemToStringValue,
    listRef,
    syncHighlightedHoverDetail,
    visibleItems,
  });
  const resetAfterValueChange = useCallback(() => {
    clearKeyboardHoverDetailSync();
    resetScrollHoverDetailState();
    setInputValue('');
    setIsSearchNavigationFocus(false);
    resetKeyboardHoverSuppression();
    hideHoverDetail();
  }, [
    clearKeyboardHoverDetailSync,
    hideHoverDetail,
    resetKeyboardHoverSuppression,
    resetScrollHoverDetailState,
    setInputValue,
    setIsSearchNavigationFocus,
  ]);
  const resetOnOpen = useCallback(() => {
    clearKeyboardHoverDetailSync();
    resetScrollHoverDetailState();
    cancelPendingHoverDetail();
  }, [
    cancelPendingHoverDetail,
    clearKeyboardHoverDetailSync,
    resetScrollHoverDetailState,
  ]);
  const resetOnClose = useCallback(() => {
    setIsSearchNavigationFocus(false);
    clearKeyboardHoverDetailSync();
    resetScrollHoverDetailState();
    hideHoverDetail();
    resetPointerHoverState();
  }, [
    clearKeyboardHoverDetailSync,
    hideHoverDetail,
    resetPointerHoverState,
    resetScrollHoverDetailState,
    setIsSearchNavigationFocus,
  ]);

  return {
    effectiveHighlightedIndex,
    handleInputValueChange,
    handleItemHighlighted,
    handleItemLeave,
    handleListScroll,
    handleOptionListMouseLeave,
    handleOptionMouseEnter,
    handleOptionMouseMove,
    handleSearchInputKeyDown,
    handleTriggerKeyDown,
    handleTriggerMouseEnter,
    handleTriggerMouseLeave,
    heldHighlightFrame,
    heldHighlightFrameKey,
    hoverDetail: hoverDetailState,
    resetAfterValueChange,
    resetOnClose,
    resetOnOpen,
  };
}
