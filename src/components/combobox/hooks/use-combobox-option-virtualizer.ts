import { useCallback, useLayoutEffect, type RefObject } from 'react';
import {
  defaultRangeExtractor,
  useVirtualizer,
  type Range,
} from '@tanstack/react-virtual';
import type { ComboboxVirtualScrollToIndex } from './use-combobox-keyboard-highlight-scroll';

const comboboxVirtualizationThreshold = 80;
const comboboxVirtualOptionEstimateSize = 36;
const comboboxVirtualOptionOverscan = 12;
const comboboxVirtualViewportFallbackHeight = 240;

const getVirtualComboboxElementRect = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();

  return {
    height: rect.height || comboboxVirtualViewportFallbackHeight,
    width: rect.width,
  };
};

const observeVirtualComboboxElementRect = (
  instance: { scrollElement: Element | null },
  callback: (rect: { height: number; width: number }) => void
) => {
  const element = instance.scrollElement as HTMLElement | null;
  if (!element) return;

  callback(getVirtualComboboxElementRect(element));
  if (typeof ResizeObserver === 'undefined') return;

  const observer = new ResizeObserver(() => {
    callback(getVirtualComboboxElementRect(element));
  });
  observer.observe(element);

  return () => {
    observer.disconnect();
  };
};

const measureVirtualComboboxOption = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();

  return (
    rect.height || element.offsetHeight || comboboxVirtualOptionEstimateSize
  );
};

const scrollVirtualComboboxElement = (
  offset: number,
  {
    adjustments = 0,
    behavior,
  }: { adjustments?: number; behavior?: ScrollBehavior },
  instance: {
    options: { horizontal?: boolean };
    scrollElement: Element | null;
  }
) => {
  const element = instance.scrollElement as HTMLElement | null;
  if (!element) return;

  const nextOffset = offset + adjustments;
  if (typeof element.scrollTo === 'function') {
    element.scrollTo({
      [instance.options.horizontal ? 'left' : 'top']: nextOffset,
      behavior,
    });
    return;
  }

  if (instance.options.horizontal) {
    element.scrollLeft = nextOffset;
  } else {
    element.scrollTop = nextOffset;
  }
};

export function useComboboxOptionVirtualizer({
  effectiveHighlightedIndex,
  inputValue,
  listElementRef,
  optionKeys,
  selectedVisibleIndex,
  virtualScrollToIndexRef,
  visibleItemCount,
}: {
  effectiveHighlightedIndex: number | null;
  inputValue: string;
  listElementRef: RefObject<HTMLDivElement | null>;
  optionKeys: string[];
  selectedVisibleIndex: number;
  virtualScrollToIndexRef: RefObject<ComboboxVirtualScrollToIndex | null>;
  visibleItemCount: number;
}) {
  const shouldVirtualize = visibleItemCount > comboboxVirtualizationThreshold;
  const virtualRangeExtractor = useCallback(
    (range: Range) => {
      const rangeIndexes = defaultRangeExtractor(range);
      if (
        effectiveHighlightedIndex === null ||
        effectiveHighlightedIndex < 0 ||
        effectiveHighlightedIndex >= visibleItemCount ||
        rangeIndexes.includes(effectiveHighlightedIndex)
      ) {
        return rangeIndexes;
      }

      return [...rangeIndexes, effectiveHighlightedIndex].sort(
        (firstIndex, secondIndex) => firstIndex - secondIndex
      );
    },
    [effectiveHighlightedIndex, visibleItemCount]
  );
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: visibleItemCount,
    enabled: shouldVirtualize,
    estimateSize: () => comboboxVirtualOptionEstimateSize,
    getItemKey: index => optionKeys[index] ?? index,
    getScrollElement: () => listElementRef.current,
    initialRect: {
      height: comboboxVirtualViewportFallbackHeight,
      width: 0,
    },
    measureElement: measureVirtualComboboxOption,
    observeElementRect: observeVirtualComboboxElementRect,
    overscan: comboboxVirtualOptionOverscan,
    rangeExtractor: virtualRangeExtractor,
    scrollToFn: scrollVirtualComboboxElement,
  });

  useLayoutEffect(() => {
    if (!shouldVirtualize) {
      virtualScrollToIndexRef.current = null;
      return;
    }

    const scrollToVirtualIndex: ComboboxVirtualScrollToIndex = (
      index,
      options
    ) => {
      virtualizer.scrollToIndex(index, options);
    };
    virtualScrollToIndexRef.current = scrollToVirtualIndex;

    return () => {
      if (virtualScrollToIndexRef.current === scrollToVirtualIndex) {
        virtualScrollToIndexRef.current = null;
      }
    };
  }, [shouldVirtualize, virtualizer, virtualScrollToIndexRef]);

  useLayoutEffect(() => {
    if (
      !shouldVirtualize ||
      inputValue.trim().length > 0 ||
      selectedVisibleIndex < 0
    ) {
      return;
    }

    virtualizer.scrollToIndex(selectedVisibleIndex, { align: 'start' });
  }, [inputValue, selectedVisibleIndex, shouldVirtualize, virtualizer]);

  return {
    shouldVirtualize,
    virtualizer,
  };
}
