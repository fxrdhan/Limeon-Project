import {
  useCallback,
  useMemo,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import type { VirtualItem } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';
import { getPharmaComboboxOptionIndexAttributes } from '../utils/preset-dom';
import { setRef } from '../utils/primitive-render';
import { Combobox } from '../internal/primitive';
import type { PharmaComboboxOptionRenderState } from '../presets-types';
import { useComboboxOptionVirtualizer } from '../hooks/use-combobox-option-virtualizer';
import { comboboxHighlightBackgroundTransition } from './combobox-highlight-motion';
import { getComboboxOptionMotionFrameProps } from './combobox-option-motion';
import { ComboboxOptionMotionFrame } from './combobox-option-motion-frame';
import {
  ComboboxSelectionIndicator,
  type ComboboxIndicatorKind,
} from './combobox-selection-indicator';
import type { ComboboxVirtualScrollToIndex } from '../hooks/use-combobox-keyboard-highlight-scroll';
import type { PharmaComboboxClassNames } from '../presets-types';

const getComboboxOptionKey = (
  optionValue: string,
  optionValueOccurrence: number
) =>
  optionValueOccurrence === 0
    ? optionValue
    : `${optionValue}__duplicate-${optionValueOccurrence}`;

export interface ComboboxOptionListProps<Item> {
  effectiveHighlightedIndex: number | null;
  classNames?: PharmaComboboxClassNames;
  hasHeldHighlightFrame: boolean;
  hasVisibleItems: boolean;
  highlightClassName?: string;
  indicator: ComboboxIndicatorKind;
  inputValue: string;
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
  visibleItems: readonly Item[];
  virtualScrollToIndexRef: RefObject<ComboboxVirtualScrollToIndex | null>;
  visualHighlightId: string;
}

export function ComboboxOptionList<Item>({
  classNames,
  effectiveHighlightedIndex,
  hasHeldHighlightFrame,
  hasVisibleItems,
  highlightClassName,
  indicator,
  inputValue,
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
  const { shouldVirtualize, virtualizer } = useComboboxOptionVirtualizer({
    effectiveHighlightedIndex,
    inputValue,
    listElementRef,
    optionKeys,
    selectedVisibleIndex,
    virtualScrollToIndexRef,
    visibleItemCount: visibleItems.length,
  });
  const setListElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      listElementRef.current = node;
      setRef(listRef, node);
    },
    [listRef]
  );
  const optionHighlightClassName =
    highlightClassName ?? classNames?.optionHighlight;
  const shouldTrackOptionLayout = hasVisibleItems;
  const getOptionClassName = (state: {
    disabled: boolean;
    selected: boolean;
  }) =>
    cn(
      'relative flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-800 outline-hidden',
      classNames?.option,
      state.selected && 'font-semibold text-primary',
      state.selected && classNames?.optionSelected,
      state.disabled && 'cursor-not-allowed opacity-50',
      state.disabled && classNames?.optionDisabled
    );

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
            className={cn(
              'pointer-events-none absolute inset-0 z-0 rounded-lg bg-primary/10',
              optionHighlightClassName
            )}
            transition={comboboxHighlightBackgroundTransition}
          />
        ) : null}
        <span
          className={cn(
            'relative z-10 flex min-w-0 flex-1 items-center gap-2',
            classNames?.optionContent
          )}
        >
          <ComboboxSelectionIndicator
            classNames={classNames}
            kind={indicator}
            selected={state.selected}
          />
          {renderOption ? (
            <span className={cn('min-w-0 flex-1', classNames?.optionLabel)}>
              {renderOption(item, renderState)}
            </span>
          ) : (
            <span
              className={cn('min-w-0 flex-1 truncate', classNames?.optionLabel)}
            >
              {labelText}
            </span>
          )}
          {optionMeta ? (
            <span
              className={cn(
                'shrink-0 text-xs font-normal text-slate-500',
                classNames?.optionMeta
              )}
            >
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
            className={getOptionClassName(state)}
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
              {...getComboboxOptionMotionFrameProps({
                shouldAnimate: shouldAnimateListItems,
                shouldTrackLayout: shouldTrackOptionLayout,
              })}
              {...getPharmaComboboxOptionIndexAttributes(virtualItem.index)}
              ref={node => {
                setRef(ref, node);
                virtualizer.measureElement(node);
              }}
              data-index={virtualItem.index}
              className={getOptionClassName(state)}
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
        hasVisibleItems ? 'max-h-60 flex-1 p-1' : 'max-h-0 p-0',
        classNames?.list
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
            shouldTrackLayout={shouldTrackOptionLayout}
          >
            {renderComboboxItem(item, index)}
          </ComboboxOptionMotionFrame>
        ))
      )}
    </Combobox.List>
  );
}
