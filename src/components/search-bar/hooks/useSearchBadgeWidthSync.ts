import { useEffect, useMemo, useRef, type RefObject } from 'react';
import type { EnhancedSearchState } from '../types';

const getCurrentBadgeCount = (
  searchMode: EnhancedSearchState,
  showTargetedIndicator: boolean
) => {
  if (!showTargetedIndicator) return 0;

  let count = 0;
  const filter = searchMode.filterSearch;

  if (searchMode.selectedColumn || filter?.field) count++;
  if (filter?.operator) count++;
  if (filter?.value) count++;

  if (filter?.operator === 'inRange') {
    if (filter.valueTo || filter.waitingForValueTo) count++;
    if (filter.valueTo) count++;
  }

  if (searchMode.partialJoin || filter?.joinOperator) count++;

  const hasSecondCondition =
    (filter?.conditions && filter.conditions.length >= 2) ||
    searchMode.partialConditions?.[1]?.operator;

  if (hasSecondCondition) {
    count++;
    const secondCondition =
      filter?.conditions?.[1] || searchMode.partialConditions?.[1];
    if (secondCondition?.value) count++;
    if (secondCondition?.operator === 'inRange') {
      const waitingForValueTo = (
        secondCondition as { waitingForValueTo?: boolean }
      ).waitingForValueTo;
      if (secondCondition.valueTo || waitingForValueTo) count++;
      if (secondCondition.valueTo) count++;
    }
  }

  return count;
};

interface UseSearchBadgeWidthSyncParams {
  showTargetedIndicator: boolean;
  searchMode: EnhancedSearchState;
  inputRef?: RefObject<HTMLInputElement | null>;
  badgesContainerRef: RefObject<HTMLDivElement | null>;
  hasSecondConditionOperator: boolean;
  getColumnRef: (conditionIndex: number) => HTMLDivElement | null;
}

export const useSearchBadgeWidthSync = ({
  showTargetedIndicator,
  searchMode,
  inputRef,
  badgesContainerRef,
  hasSecondConditionOperator,
  getColumnRef,
}: UseSearchBadgeWidthSyncParams) => {
  const lastMeasuredWidthRef = useRef<number>(0);
  const lastBadgeCountRef = useRef<number>(0);

  const currentBadgeCount = useMemo(
    () => getCurrentBadgeCount(searchMode, showTargetedIndicator),
    [searchMode, showTargetedIndicator]
  );

  useEffect(() => {
    if (!showTargetedIndicator || !inputRef?.current) {
      if (inputRef?.current) {
        inputRef.current.style.removeProperty('--badge-width');
      }
      lastMeasuredWidthRef.current = 0;
      lastBadgeCountRef.current = 0;
      return;
    }

    const shouldUseContainer =
      (searchMode.isFilterMode ||
        searchMode.showJoinOperatorSelector ||
        (searchMode.showOperatorSelector && hasSecondConditionOperator) ||
        (!searchMode.isFilterMode &&
          searchMode.partialJoin &&
          !!searchMode.filterSearch) ||
        searchMode.filterSearch?.isMultiCondition) &&
      !!searchMode.filterSearch;

    const targetElement =
      shouldUseContainer && badgesContainerRef.current
        ? badgesContainerRef.current
        : getColumnRef(0);

    if (!targetElement || !inputRef.current) {
      return;
    }

    const inputElement = inputRef.current;

    const badgeAdded = currentBadgeCount > lastBadgeCountRef.current;
    const badgeRemoved = currentBadgeCount < lastBadgeCountRef.current;
    lastBadgeCountRef.current = currentBadgeCount;

    const updatePadding = () => {
      if (!targetElement || !inputElement) return;

      const badgeWidth = targetElement.offsetWidth;
      if (badgeWidth === 0) return;

      if (Math.abs(badgeWidth - lastMeasuredWidthRef.current) > 2) {
        lastMeasuredWidthRef.current = badgeWidth;
        inputElement.style.setProperty('--badge-width', `${badgeWidth + 16}px`);
      }
    };

    let initialTimer: ReturnType<typeof setTimeout> | null = null;
    let frameId: number | null = null;

    if (badgeAdded) {
      initialTimer = setTimeout(() => {
        updatePadding();
      }, 300);
    } else if (badgeRemoved) {
      updatePadding();
    } else {
      frameId = requestAnimationFrame(() => {
        updatePadding();
      });
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const resizeObserver = new ResizeObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        updatePadding();
      }, 16);
    });

    resizeObserver.observe(targetElement);

    return () => {
      resizeObserver.disconnect();
      if (initialTimer) clearTimeout(initialTimer);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [
    showTargetedIndicator,
    searchMode.isFilterMode,
    searchMode.showJoinOperatorSelector,
    searchMode.showOperatorSelector,
    searchMode.filterSearch,
    searchMode.filterSearch?.isMultiCondition,
    searchMode.partialJoin,
    inputRef,
    badgesContainerRef,
    hasSecondConditionOperator,
    currentBadgeCount,
    getColumnRef,
  ]);
};
