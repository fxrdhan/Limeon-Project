import { useEffect, type MutableRefObject } from 'react';
import type { HoverDetailData } from '@/types/components';

const keyboardHoverDetailSyncDelay = 90;

export function useComboboxKeyboardHoverDetailSync<Item>({
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
}: {
  actualOpen: boolean;
  cancelPendingHoverDetail: () => void;
  clearKeyboardHoverDetailSync: () => void;
  effectiveHighlightedIndex: number | null;
  getHighlightedHoverDetailAnchorElement: (index: number) => HTMLElement | null;
  getItemHoverDetailData: (item: Item) => Partial<HoverDetailData>;
  hoverDetailEnabled: boolean;
  isItemDisabled: (item: Item) => boolean;
  isKeyboardHoverSuppressed: () => boolean;
  itemToStringValue: (item: Item) => string;
  keyboardHoverDetailSyncTimeoutRef: MutableRefObject<ReturnType<
    typeof setTimeout
  > | null>;
  syncHighlightedHoverDetail: (
    itemId: string,
    element: HTMLElement,
    itemData?: Partial<HoverDetailData>,
    options?: { show?: boolean }
  ) => void;
  visibleItems: Item[];
}) {
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
    keyboardHoverDetailSyncTimeoutRef,
    syncHighlightedHoverDetail,
    visibleItems,
  ]);

  useEffect(() => clearKeyboardHoverDetailSync, [clearKeyboardHoverDetailSync]);
}
