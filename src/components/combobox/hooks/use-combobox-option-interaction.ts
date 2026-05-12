import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MouseEvent,
  type RefObject,
  type SetStateAction,
} from 'react';
import type { HoverDetailData } from '@/types/components';
import { getPharmaComboboxOptionIndexSelector } from '../utils/preset-dom';
import { getDefaultHoverDetailData } from '../utils/preset-item';
import { useComboboxHighlight } from './use-combobox-highlight';
import { useComboboxHoverDetail } from './use-combobox-hover-detail';
import { useComboboxKeyboardHighlightScroll } from './use-combobox-keyboard-highlight-scroll';
import { useComboboxPointerHover } from './use-combobox-pointer-hover';
import { useComboboxScrollHoverDetailSync } from './use-combobox-scroll-hover-detail-sync';

const keyboardHoverDetailSyncDelay = 90;

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
  visibleItems: Item[];
}) {
  const keyboardHoverDetailSyncTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const hoverDetailEnabled =
    hoverDetail?.enabled ??
    Boolean(onFetchHoverDetail || itemToHoverDetailData);
  const {
    cancelPendingHoverDetail,
    data: hoverDetailData,
    handleItemHover,
    handleItemLeave,
    hidePopover: hideHoverDetail,
    isVisible: isHoverDetailVisible,
    position: hoverDetailPosition,
    syncHighlightedHoverDetail,
  } = useComboboxHoverDetail({
    boundaryRef: popupContentRef,
    hoverDelay: hoverDetail?.delay ?? 800,
    isComboboxOpen: actualOpen,
    isEnabled: hoverDetailEnabled,
    onFetchData: onFetchHoverDetail,
    onFetchError: onFetchHoverDetailError,
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
  const getItemHoverDetailData = useCallback(
    (item: Item): Partial<HoverDetailData> => {
      const idValue = itemToStringValue(item);
      const nameValue = itemToStringLabel(item);
      const customData = itemToHoverDetailData?.(item);

      return {
        ...getDefaultHoverDetailData(item),
        ...customData,
        id: idValue,
        name: nameValue,
      };
    },
    [itemToHoverDetailData, itemToStringLabel, itemToStringValue]
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
    handleHighlightedIndexChange,
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
  const handleTriggerMouseEnter = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (actualOpen || !hoverDetailEnabled || selectedValue === null) return;

      handleItemHover(
        itemToStringValue(selectedValue),
        event.currentTarget,
        getItemHoverDetailData(selectedValue)
      );
    },
    [
      actualOpen,
      getItemHoverDetailData,
      handleItemHover,
      hoverDetailEnabled,
      itemToStringValue,
      selectedValue,
    ]
  );
  const handleTriggerMouseLeave = useCallback(() => {
    if (actualOpen || !hoverDetailEnabled || selectedValue === null) return;

    handleItemLeave();
  }, [actualOpen, handleItemLeave, hoverDetailEnabled, selectedValue]);
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

  useEffect(() => {
    if (!actualOpen || !hoverDetailEnabled) return;
    if (!isKeyboardHoverSuppressed()) return;
    if (effectiveHighlightedIndex === null) return;

    const highlightedItem = visibleItems[effectiveHighlightedIndex];
    if (highlightedItem === undefined || isItemDisabled(highlightedItem)) {
      return;
    }

    cancelPendingHoverDetail();
    keyboardHoverDetailSyncTimeoutRef.current = setTimeout(() => {
      keyboardHoverDetailSyncTimeoutRef.current = null;

      const anchorElement = getHighlightedHoverDetailAnchorElement(
        effectiveHighlightedIndex
      );
      if (!anchorElement) return;

      syncHighlightedHoverDetail(
        itemToStringValue(highlightedItem),
        anchorElement,
        getItemHoverDetailData(highlightedItem),
        { show: true }
      );
    }, keyboardHoverDetailSyncDelay);

    return clearKeyboardHoverDetailSync;
  }, [
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
    syncHighlightedHoverDetail,
    visibleItems,
  ]);

  useEffect(() => clearKeyboardHoverDetailSync, [clearKeyboardHoverDetailSync]);

  return {
    effectiveHighlightedIndex,
    handleHighlightedIndexChange,
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
    hoverDetail: {
      data: hoverDetailData,
      enabled: hoverDetailEnabled,
      isVisible: isHoverDetailVisible,
      position: hoverDetailPosition,
    },
    resetAfterValueChange,
    resetOnClose,
    resetOnOpen,
  };
}
