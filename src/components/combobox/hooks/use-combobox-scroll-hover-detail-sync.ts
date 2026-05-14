import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { HoverDetailData } from '@/types/components';

const scrollHoverDetailActivityResetDelay = 180;
const scrollHoverDetailBurstWindow = 180;
const scrollHoverDetailFastDistance = 72;
const scrollHoverDetailResumeDelay = 140;

type ListScrollActivity = {
  accumulatedDistance: number;
  initialized: boolean;
  lastAt: number;
  lastTop: number;
  suspended: boolean;
};

const createListScrollActivity = (): ListScrollActivity => ({
  accumulatedDistance: 0,
  initialized: false,
  lastAt: 0,
  lastTop: 0,
  suspended: false,
});

export function useComboboxScrollHoverDetailSync<Item>({
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
}: {
  actualOpen: boolean;
  cancelPendingHoverDetail: () => void;
  clearKeyboardHoverDetailSync: () => void;
  effectiveHighlightedIndex: number | null;
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
  listRef: RefObject<HTMLDivElement | null>;
  syncHighlightedHoverDetail: (
    itemId: string,
    element: HTMLElement,
    itemData?: Partial<HoverDetailData>,
    options?: { show?: boolean }
  ) => void;
  visibleItems: readonly Item[];
}) {
  const scrollHoverDetailResumeTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const scrollHoverDetailActivityResetTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const shouldResumeHoverDetailAfterScrollRef = useRef(false);
  const isHoverDetailVisibleRef = useRef(false);
  const listScrollActivityRef = useRef<ListScrollActivity>(
    createListScrollActivity()
  );

  const clearScrollHoverDetailResume = useCallback(() => {
    if (scrollHoverDetailResumeTimeoutRef.current === null) return;

    clearTimeout(scrollHoverDetailResumeTimeoutRef.current);
    scrollHoverDetailResumeTimeoutRef.current = null;
  }, []);
  const clearListScrollActivityReset = useCallback(() => {
    if (scrollHoverDetailActivityResetTimeoutRef.current === null) return;

    clearTimeout(scrollHoverDetailActivityResetTimeoutRef.current);
    scrollHoverDetailActivityResetTimeoutRef.current = null;
  }, []);
  const resetListScrollActivity = useCallback(() => {
    listScrollActivityRef.current = {
      ...createListScrollActivity(),
      lastTop: listRef.current?.scrollTop ?? 0,
    };
  }, [listRef]);
  const resetScrollHoverDetailState = useCallback(() => {
    clearListScrollActivityReset();
    resetListScrollActivity();
    clearScrollHoverDetailResume();
    shouldResumeHoverDetailAfterScrollRef.current = false;
  }, [
    clearListScrollActivityReset,
    clearScrollHoverDetailResume,
    resetListScrollActivity,
  ]);
  const scheduleListScrollActivityReset = useCallback(() => {
    clearListScrollActivityReset();
    scrollHoverDetailActivityResetTimeoutRef.current = setTimeout(() => {
      scrollHoverDetailActivityResetTimeoutRef.current = null;
      resetListScrollActivity();
    }, scrollHoverDetailActivityResetDelay);
  }, [clearListScrollActivityReset, resetListScrollActivity]);
  const syncHoverDetailAfterScroll = useCallback(() => {
    if (!shouldResumeHoverDetailAfterScrollRef.current) return;

    shouldResumeHoverDetailAfterScrollRef.current = false;
    if (!actualOpen || !hoverDetailEnabled) return;
    if (isKeyboardHoverSuppressed()) return;
    if (effectiveHighlightedIndex === null) return;

    const highlightedItem = visibleItems[effectiveHighlightedIndex];
    if (highlightedItem === undefined || isItemDisabled(highlightedItem)) {
      return;
    }

    const optionElement = getOptionElementAtIndex(effectiveHighlightedIndex);
    if (!optionElement || !isOptionElementFullyVisible(optionElement)) return;

    const anchorElement =
      optionElement.querySelector<HTMLElement>(
        '[data-pharma-combobox-highlight]'
      ) ?? optionElement;

    syncHighlightedHoverDetail(
      itemToStringValue(highlightedItem),
      anchorElement,
      getItemHoverDetailData(highlightedItem),
      { show: true }
    );
  }, [
    actualOpen,
    effectiveHighlightedIndex,
    getItemHoverDetailData,
    getOptionElementAtIndex,
    hoverDetailEnabled,
    isItemDisabled,
    isKeyboardHoverSuppressed,
    isOptionElementFullyVisible,
    itemToStringValue,
    syncHighlightedHoverDetail,
    visibleItems,
  ]);
  const resumeHoverDetailAfterScroll = useCallback(() => {
    scrollHoverDetailResumeTimeoutRef.current = null;
    resetListScrollActivity();
    clearListScrollActivityReset();
    syncHoverDetailAfterScroll();
  }, [
    clearListScrollActivityReset,
    resetListScrollActivity,
    syncHoverDetailAfterScroll,
  ]);
  const handleListScroll = useCallback(() => {
    if (!hoverDetailEnabled || isKeyboardHoverSuppressed()) return;

    const list = listRef.current;
    const scrollActivity = listScrollActivityRef.current;
    const now =
      typeof performance === 'undefined' ? Date.now() : performance.now();
    const currentScrollTop = list?.scrollTop ?? 0;
    const scrollDistance = Math.abs(currentScrollTop - scrollActivity.lastTop);
    const isSameScrollBurst =
      scrollActivity.initialized &&
      now - scrollActivity.lastAt <= scrollHoverDetailBurstWindow;
    const accumulatedDistance = isSameScrollBurst
      ? scrollActivity.accumulatedDistance + scrollDistance
      : scrollDistance;
    const isFastScroll =
      scrollActivity.suspended ||
      accumulatedDistance >= scrollHoverDetailFastDistance;
    const wasHoverDetailVisible = isHoverDetailVisibleRef.current;

    listScrollActivityRef.current = {
      accumulatedDistance,
      initialized: true,
      lastAt: now,
      lastTop: currentScrollTop,
      suspended: isFastScroll,
    };

    shouldResumeHoverDetailAfterScrollRef.current =
      shouldResumeHoverDetailAfterScrollRef.current || wasHoverDetailVisible;

    if (!isFastScroll) {
      clearScrollHoverDetailResume();
      syncHoverDetailAfterScroll();
      scheduleListScrollActivityReset();
      return;
    }

    cancelPendingHoverDetail();
    clearKeyboardHoverDetailSync();
    if (wasHoverDetailVisible) {
      isHoverDetailVisibleRef.current = false;
      hideHoverDetail();
    }

    clearListScrollActivityReset();
    clearScrollHoverDetailResume();
    scrollHoverDetailResumeTimeoutRef.current = setTimeout(
      resumeHoverDetailAfterScroll,
      scrollHoverDetailResumeDelay
    );
  }, [
    cancelPendingHoverDetail,
    clearKeyboardHoverDetailSync,
    clearListScrollActivityReset,
    clearScrollHoverDetailResume,
    hideHoverDetail,
    hoverDetailEnabled,
    isKeyboardHoverSuppressed,
    listRef,
    resumeHoverDetailAfterScroll,
    scheduleListScrollActivityReset,
    syncHoverDetailAfterScroll,
  ]);
  const handleOptionListMouseLeave = useCallback(() => {
    shouldResumeHoverDetailAfterScrollRef.current = false;
    clearListScrollActivityReset();
    clearScrollHoverDetailResume();
    resetListScrollActivity();
    handleListMouseLeave();
  }, [
    clearListScrollActivityReset,
    clearScrollHoverDetailResume,
    handleListMouseLeave,
    resetListScrollActivity,
  ]);

  useEffect(() => {
    isHoverDetailVisibleRef.current = isHoverDetailVisible;
  }, [isHoverDetailVisible]);

  useEffect(
    () => () => {
      clearListScrollActivityReset();
      clearScrollHoverDetailResume();
    },
    [clearListScrollActivityReset, clearScrollHoverDetailResume]
  );

  return {
    handleListScroll,
    handleOptionListMouseLeave,
    resetScrollHoverDetailState,
  };
}
