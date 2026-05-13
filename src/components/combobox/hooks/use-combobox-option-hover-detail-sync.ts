import type { RefObject } from 'react';
import type { HoverDetailData } from '@/types/components';
import { useComboboxKeyboardHoverDetailSync } from './use-combobox-keyboard-hover-detail-sync';
import { useComboboxScrollHoverDetailSync } from './use-combobox-scroll-hover-detail-sync';
import type { ComboboxKeyboardHoverDetailTimerRef } from './use-combobox-keyboard-hover-detail-timer';

export function useComboboxOptionHoverDetailSync<Item>({
  actualOpen,
  cancelPendingHoverDetail,
  clearKeyboardHoverDetailSync,
  effectiveHighlightedIndex,
  getHighlightedHoverDetailAnchorElement,
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
  keyboardHoverDetailSyncTimeoutRef,
  listRef,
  syncHighlightedHoverDetail,
  visibleItems,
}: {
  actualOpen: boolean;
  cancelPendingHoverDetail: () => void;
  clearKeyboardHoverDetailSync: () => void;
  effectiveHighlightedIndex: number | null;
  getHighlightedHoverDetailAnchorElement: (index: number) => HTMLElement | null;
  getItemHoverDetailData: (item: Item) => Partial<HoverDetailData>;
  getOptionElementAtIndex: (index: number) => HTMLElement | null;
  handleListMouseLeave: () => void;
  hideHoverDetail: () => void;
  hoverDetailEnabled: boolean;
  isHoverDetailVisible: boolean;
  isItemDisabled: (item: Item) => boolean;
  isKeyboardHoverSuppressed: () => boolean;
  isOptionElementFullyVisible: (element: HTMLElement) => boolean;
  itemToStringValue: (item: Item) => string;
  keyboardHoverDetailSyncTimeoutRef: ComboboxKeyboardHoverDetailTimerRef;
  listRef: RefObject<HTMLDivElement | null>;
  syncHighlightedHoverDetail: (
    itemId: string,
    element: HTMLElement,
    itemData?: Partial<HoverDetailData>,
    options?: { show?: boolean }
  ) => void;
  visibleItems: Item[];
}) {
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

  return useComboboxScrollHoverDetailSync({
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
}
