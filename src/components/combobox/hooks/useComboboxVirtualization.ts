import {
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  KEYBOARD_SCROLL_VISIBILITY_INSET,
  type KeyboardScrollTarget,
} from '@/components/shared/keyboard-pinned-highlight';
import { COMBOBOX_CONSTANTS } from '../constants';

type UseComboboxVirtualizationOptions = {
  enabled: boolean;
  itemCount: number;
  resetKey: unknown;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
};

export type ComboboxVirtualItem = {
  index: number;
  start: number;
};

const getLowerBoundIndex = (offsets: number[], value: number) => {
  let low = 0;
  let high = offsets.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((offsets[middle] ?? 0) < value) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return low;
};

export const useComboboxVirtualization = ({
  enabled,
  itemCount,
  resetKey,
  scrollContainerRef,
}: UseComboboxVirtualizationOptions) => {
  const measuredHeightsRef = useRef(new Map<number, number>());
  const previousResetKeyRef = useRef(resetKey);
  const [measurementVersion, setMeasurementVersion] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  if (previousResetKeyRef.current !== resetKey) {
    previousResetKeyRef.current = resetKey;
    measuredHeightsRef.current.clear();
  }

  const updateScrollMetrics = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const nextScrollTop = container.scrollTop;
    const nextViewportHeight = container.clientHeight;

    setScrollTop(previousScrollTop =>
      previousScrollTop === nextScrollTop ? previousScrollTop : nextScrollTop
    );
    setViewportHeight(previousViewportHeight =>
      previousViewportHeight === nextViewportHeight
        ? previousViewportHeight
        : nextViewportHeight
    );
  }, [scrollContainerRef]);

  useLayoutEffect(() => {
    if (!enabled) {
      measuredHeightsRef.current.clear();
      setMeasurementVersion(version => version + 1);
      setScrollTop(0);
      setViewportHeight(0);
      return;
    }

    updateScrollMetrics();
    const frameId = window.requestAnimationFrame(updateScrollMetrics);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [enabled, itemCount, updateScrollMetrics]);

  useEffect(() => {
    if (!enabled) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', updateScrollMetrics, {
      passive: true,
    });
    window.addEventListener('resize', updateScrollMetrics);

    return () => {
      container.removeEventListener('scroll', updateScrollMetrics);
      window.removeEventListener('resize', updateScrollMetrics);
    };
  }, [enabled, scrollContainerRef, updateScrollMetrics]);

  useEffect(() => {
    if (!enabled) return;

    measuredHeightsRef.current.forEach((_, index, measurements) => {
      if (index >= itemCount) {
        measurements.delete(index);
      }
    });
    setMeasurementVersion(version => version + 1);
  }, [enabled, itemCount]);

  const { offsets, totalSize } = useMemo(() => {
    void measurementVersion;
    void resetKey;

    if (!enabled) {
      return { offsets: [] as number[], totalSize: 0 };
    }

    const nextOffsets = Array.from({ length: itemCount }, () => 0);
    let nextTotalSize = 0;

    for (let index = 0; index < itemCount; index += 1) {
      nextOffsets[index] = nextTotalSize;
      nextTotalSize +=
        measuredHeightsRef.current.get(index) ??
        COMBOBOX_CONSTANTS.OPTION_ESTIMATED_HEIGHT;
    }

    return { offsets: nextOffsets, totalSize: nextTotalSize };
  }, [enabled, itemCount, measurementVersion, resetKey]);

  const visibleRange = useMemo(() => {
    if (!enabled || itemCount === 0) {
      return { startIndex: 0, endIndex: itemCount };
    }

    const overscan = COMBOBOX_CONSTANTS.VIRTUALIZATION_OVERSCAN;
    const viewportBottom = scrollTop + viewportHeight;
    const firstVisibleIndex = Math.max(
      0,
      getLowerBoundIndex(offsets, scrollTop) - 1
    );
    let lastVisibleIndex = firstVisibleIndex;

    while (
      lastVisibleIndex < itemCount &&
      (offsets[lastVisibleIndex] ?? 0) < viewportBottom
    ) {
      lastVisibleIndex += 1;
    }

    return {
      startIndex: Math.max(0, firstVisibleIndex - overscan),
      endIndex: Math.min(itemCount, lastVisibleIndex + overscan + 1),
    };
  }, [enabled, itemCount, offsets, scrollTop, viewportHeight]);

  const virtualItems = useMemo<ComboboxVirtualItem[]>(() => {
    if (!enabled) return [];

    const items: ComboboxVirtualItem[] = [];

    for (
      let index = visibleRange.startIndex;
      index < visibleRange.endIndex;
      index += 1
    ) {
      items.push({
        index,
        start: offsets[index] ?? 0,
      });
    }

    return items;
  }, [enabled, offsets, visibleRange.endIndex, visibleRange.startIndex]);

  const measureElement = useCallback((index: number, element: HTMLElement) => {
    const nextHeight = element.offsetHeight;
    if (nextHeight <= 0) return;

    const previousHeight = measuredHeightsRef.current.get(index);
    if (
      previousHeight !== undefined &&
      Math.abs(previousHeight - nextHeight) < 1
    ) {
      return;
    }

    measuredHeightsRef.current.set(index, nextHeight);
    setMeasurementVersion(version => version + 1);
  }, []);

  const getScrollTargetForIndex = useCallback(
    (index: number): KeyboardScrollTarget | null => {
      const container = scrollContainerRef.current;
      if (!enabled || !container || index < 0 || index >= itemCount) {
        return null;
      }

      const itemTop =
        offsets[index] ?? index * COMBOBOX_CONSTANTS.OPTION_ESTIMATED_HEIGHT;
      const itemHeight =
        measuredHeightsRef.current.get(index) ??
        COMBOBOX_CONSTANTS.OPTION_ESTIMATED_HEIGHT;
      const itemBottom = itemTop + itemHeight;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      if (itemTop < containerScrollTop + KEYBOARD_SCROLL_VISIBILITY_INSET) {
        return {
          scrollTop: Math.max(0, itemTop - KEYBOARD_SCROLL_VISIBILITY_INSET),
          direction: 'up',
        };
      }

      if (
        itemBottom >
        containerScrollTop + containerHeight - KEYBOARD_SCROLL_VISIBILITY_INSET
      ) {
        return {
          scrollTop: Math.max(
            0,
            index === itemCount - 1
              ? totalSize - containerHeight
              : itemBottom - containerHeight + KEYBOARD_SCROLL_VISIBILITY_INSET
          ),
          direction: 'down',
        };
      }

      return null;
    },
    [enabled, itemCount, offsets, scrollContainerRef, totalSize]
  );

  return {
    isVirtualized: enabled,
    totalSize,
    virtualItems,
    visibleRange,
    measureElement,
    getScrollTargetForIndex,
    updateScrollMetrics,
  };
};
