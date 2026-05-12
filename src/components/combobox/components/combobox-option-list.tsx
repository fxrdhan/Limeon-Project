import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import {
  defaultRangeExtractor,
  useVirtualizer,
  type Range,
  type VirtualItem,
} from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import {
  getPharmaComboboxOptionIndexAttributes,
  setRef,
} from '../utils/preset-dom';
import { Combobox } from '../primitive';
import type { PharmaComboboxOptionRenderState } from '../presets-types';
import { comboboxHighlightBackgroundTransition } from './combobox-highlight-motion';
import { getComboboxOptionMotionFrameProps } from './combobox-option-motion';
import { ComboboxOptionMotionFrame } from './combobox-option-motion-frame';
import {
  ComboboxSelectionIndicator,
  type ComboboxIndicatorKind,
} from './combobox-selection-indicator';
import type { ComboboxVirtualScrollToIndex } from '../hooks/use-combobox-keyboard-highlight-scroll';

const getComboboxOptionKey = (
  optionValue: string,
  optionValueOccurrence: number
) =>
  optionValueOccurrence === 0
    ? optionValue
    : `${optionValue}__duplicate-${optionValueOccurrence}`;

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

export interface ComboboxOptionListProps<Item> {
  effectiveHighlightedIndex: number | null;
  hasHeldHighlightFrame: boolean;
  hasVisibleItems: boolean;
  indicator: ComboboxIndicatorKind;
  inputValue: string;
  isItemDisabled: (item: Item) => boolean;
  itemToStringLabel: (item: Item) => string;
  itemToStringValue: (item: Item) => string;
  listRef: Ref<HTMLDivElement>;
  listboxAriaLabel?: string;
  onItemLeave: () => void;
  onListMouseLeave: () => void;
  onListScrollIntent: () => void;
  onOptionMouseEnter: (event: MouseEvent<HTMLElement>, item: Item) => void;
  onOptionMouseMove: (event: MouseEvent<HTMLElement>, item: Item) => void;
  renderOption?: (
    item: Item,
    state: PharmaComboboxOptionRenderState
  ) => ReactNode;
  renderOptionMeta?: (
    item: Item,
    state: PharmaComboboxOptionRenderState
  ) => ReactNode;
  selectedVisibleIndex: number;
  shouldAnimateListItems: boolean;
  visibleItems: Item[];
  virtualScrollToIndexRef: RefObject<ComboboxVirtualScrollToIndex | null>;
  visualHighlightId: string;
}

export function ComboboxOptionList<Item>({
  effectiveHighlightedIndex,
  hasHeldHighlightFrame,
  hasVisibleItems,
  indicator,
  inputValue,
  isItemDisabled,
  itemToStringLabel,
  itemToStringValue,
  listRef,
  listboxAriaLabel,
  onItemLeave,
  onListMouseLeave,
  onListScrollIntent,
  onOptionMouseEnter,
  onOptionMouseMove,
  renderOption,
  renderOptionMeta,
  selectedVisibleIndex,
  shouldAnimateListItems,
  visibleItems,
  virtualScrollToIndexRef,
  visualHighlightId,
}: ComboboxOptionListProps<Item>) {
  const listElementRef = useRef<HTMLDivElement | null>(null);
  const optionKeys = useMemo(() => {
    const optionValueOccurrences = new Map<string, number>();

    return visibleItems.map(item => {
      const optionValue = itemToStringValue(item);
      const optionValueOccurrence =
        optionValueOccurrences.get(optionValue) ?? 0;
      optionValueOccurrences.set(optionValue, optionValueOccurrence + 1);

      return getComboboxOptionKey(optionValue, optionValueOccurrence);
    });
  }, [itemToStringValue, visibleItems]);
  const shouldVirtualize =
    visibleItems.length > comboboxVirtualizationThreshold;
  const virtualRangeExtractor = useCallback(
    (range: Range) => {
      const rangeIndexes = defaultRangeExtractor(range);
      if (
        effectiveHighlightedIndex === null ||
        effectiveHighlightedIndex < 0 ||
        effectiveHighlightedIndex >= visibleItems.length ||
        rangeIndexes.includes(effectiveHighlightedIndex)
      ) {
        return rangeIndexes;
      }

      return [...rangeIndexes, effectiveHighlightedIndex].sort(
        (firstIndex, secondIndex) => firstIndex - secondIndex
      );
    },
    [effectiveHighlightedIndex, visibleItems.length]
  );
  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: visibleItems.length,
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
  const setListElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      listElementRef.current = node;
      setRef(listRef, node);
    },
    [listRef]
  );

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

  const renderOptionContent = (
    item: Item,
    index: number,
    state: {
      disabled: boolean;
      selected: boolean;
    },
    labelText: string,
    optionMeta: ReactNode,
    renderState: PharmaComboboxOptionRenderState
  ) => {
    const isVisuallyHighlighted = effectiveHighlightedIndex === index;

    return (
      <>
        {isVisuallyHighlighted && !hasHeldHighlightFrame ? (
          <motion.div
            key={`${visualHighlightId}-${inputValue}`}
            layoutId={`${visualHighlightId}-${inputValue}`}
            initial={false}
            data-pharma-combobox-highlight=""
            className="pointer-events-none absolute inset-0 z-0 rounded-lg bg-primary/10"
            transition={comboboxHighlightBackgroundTransition}
          />
        ) : null}
        <span className="relative z-10 flex min-w-0 flex-1 items-center gap-2">
          <ComboboxSelectionIndicator
            kind={indicator}
            selected={state.selected}
          />
          {renderOption ? (
            <span className="min-w-0 flex-1">
              {renderOption(item, renderState)}
            </span>
          ) : (
            <span className="min-w-0 flex-1 truncate">{labelText}</span>
          )}
          {optionMeta ? (
            <span className="shrink-0 text-xs font-normal text-slate-500">
              {optionMeta}
            </span>
          ) : null}
        </span>
      </>
    );
  };

  const renderComboboxItem = (item: Item, index: number) => (
    <Combobox.Item
      value={item}
      index={index}
      disabled={isItemDisabled(item)}
      {...getPharmaComboboxOptionIndexAttributes(index)}
      onMouseEnter={event => {
        onOptionMouseEnter(event, item);
      }}
      onMouseMove={event => {
        onOptionMouseMove(event, item);
      }}
      onMouseLeave={onItemLeave}
      render={(props, state) => {
        const { ref, ...itemProps } = props;
        const labelText = itemToStringLabel(item);
        const isVisuallyHighlighted = effectiveHighlightedIndex === index;
        const renderState: PharmaComboboxOptionRenderState = {
          disabled: state.disabled,
          highlighted: isVisuallyHighlighted,
          inputValue,
          label: labelText,
          selected: state.selected,
        };
        const optionMeta = renderOptionMeta?.(item, renderState);

        return (
          <div
            {...itemProps}
            {...getPharmaComboboxOptionIndexAttributes(index)}
            ref={node => {
              setRef(ref, node);
            }}
            className={cn(
              'relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-800 outline-hidden',
              state.selected && 'font-semibold text-primary',
              state.disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {renderOptionContent(
              item,
              index,
              state,
              labelText,
              optionMeta,
              renderState
            )}
          </div>
        );
      }}
    />
  );

  const renderVirtualComboboxItem = (virtualItem: VirtualItem) => {
    const item = visibleItems[virtualItem.index];
    if (item === undefined) return null;

    return (
      <Combobox.Item
        key={virtualItem.key}
        value={item}
        index={virtualItem.index}
        disabled={isItemDisabled(item)}
        {...getPharmaComboboxOptionIndexAttributes(virtualItem.index)}
        onMouseEnter={event => {
          onOptionMouseEnter(event, item);
        }}
        onMouseMove={event => {
          onOptionMouseMove(event, item);
        }}
        onMouseLeave={onItemLeave}
        render={(props, state) => {
          const { ref, style, ...itemProps } = props;
          const virtualItemProps = itemProps as HTMLMotionProps<'div'>;
          const labelText = itemToStringLabel(item);
          const isVisuallyHighlighted =
            effectiveHighlightedIndex === virtualItem.index;
          const renderState: PharmaComboboxOptionRenderState = {
            disabled: state.disabled,
            highlighted: isVisuallyHighlighted,
            inputValue,
            label: labelText,
            selected: state.selected,
          };
          const optionMeta = renderOptionMeta?.(item, renderState);
          const virtualStyle: CSSProperties = {
            ...style,
            left: 0,
            position: 'absolute',
            top: virtualItem.start,
            width: '100%',
          };

          return (
            <motion.div
              {...virtualItemProps}
              {...getComboboxOptionMotionFrameProps(shouldAnimateListItems)}
              {...getPharmaComboboxOptionIndexAttributes(virtualItem.index)}
              ref={node => {
                setRef(ref, node);
                virtualizer.measureElement(node);
              }}
              data-index={virtualItem.index}
              className={cn(
                'relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-800 outline-hidden',
                state.selected && 'font-semibold text-primary',
                state.disabled && 'cursor-not-allowed opacity-50'
              )}
              style={virtualStyle}
            >
              {renderOptionContent(
                item,
                virtualItem.index,
                state,
                labelText,
                optionMeta,
                renderState
              )}
            </motion.div>
          );
        }}
      />
    );
  };

  return (
    <Combobox.List
      ref={setListElementRef}
      aria-label={listboxAriaLabel}
      onMouseLeave={onListMouseLeave}
      onScrollCapture={onListScrollIntent}
      onTouchMove={onListScrollIntent}
      onWheel={onListScrollIntent}
      className={cn(
        'relative z-10 min-h-0 overflow-y-auto outline-hidden',
        hasVisibleItems ? 'max-h-60 flex-1 p-1' : 'max-h-0 p-0'
      )}
    >
      {shouldVirtualize ? (
        <div
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map(renderVirtualComboboxItem)}
        </div>
      ) : (
        visibleItems.map((item, index) => (
          <ComboboxOptionMotionFrame
            key={optionKeys[index]}
            shouldAnimate={shouldAnimateListItems}
          >
            {renderComboboxItem(item, index)}
          </ComboboxOptionMotionFrame>
        ))
      )}
    </Combobox.List>
  );
}
