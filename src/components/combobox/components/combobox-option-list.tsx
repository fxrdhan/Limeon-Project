import type { MouseEvent, ReactNode, Ref } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  getPharmaComboboxOptionIndexAttributes,
  setRef,
} from '../utils/preset-dom';
import { Combobox } from '../primitive';
import type { PharmaComboboxOptionRenderState } from '../presets-types';
import { comboboxHighlightBackgroundTransition } from './combobox-highlight-motion';
import { ComboboxOptionMotionFrame } from './combobox-option-motion-frame';
import {
  ComboboxSelectionIndicator,
  type ComboboxIndicatorKind,
} from './combobox-selection-indicator';

const getComboboxOptionKey = (
  optionValue: string,
  optionValueOccurrence: number
) =>
  optionValueOccurrence === 0
    ? optionValue
    : `${optionValue}__duplicate-${optionValueOccurrence}`;

interface ComboboxOptionListProps<Item> {
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
  shouldAnimateListItems: boolean;
  visibleItems: Item[];
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
  onOptionMouseEnter,
  onOptionMouseMove,
  renderOption,
  renderOptionMeta,
  shouldAnimateListItems,
  visibleItems,
  visualHighlightId,
}: ComboboxOptionListProps<Item>) {
  const optionValueOccurrences = new Map<string, number>();

  return (
    <Combobox.List
      ref={listRef}
      aria-label={listboxAriaLabel}
      onMouseLeave={onListMouseLeave}
      className={cn(
        'relative z-10 min-h-0 overflow-y-auto outline-hidden',
        hasVisibleItems ? 'max-h-60 flex-1 p-1' : 'max-h-0 p-0'
      )}
    >
      {visibleItems.map((item, index) => {
        const optionValue = itemToStringValue(item);
        const optionValueOccurrence =
          optionValueOccurrences.get(optionValue) ?? 0;
        optionValueOccurrences.set(optionValue, optionValueOccurrence + 1);

        return (
          <ComboboxOptionMotionFrame
            key={getComboboxOptionKey(optionValue, optionValueOccurrence)}
            shouldAnimate={shouldAnimateListItems}
          >
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
                const isVisuallyHighlighted =
                  effectiveHighlightedIndex === index;
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
                        <span className="min-w-0 flex-1 truncate">
                          {labelText}
                        </span>
                      )}
                      {optionMeta ? (
                        <span className="shrink-0 text-xs font-normal text-slate-500">
                          {optionMeta}
                        </span>
                      ) : null}
                    </span>
                  </div>
                );
              }}
            />
          </ComboboxOptionMotionFrame>
        );
      })}
    </Combobox.List>
  );
}
