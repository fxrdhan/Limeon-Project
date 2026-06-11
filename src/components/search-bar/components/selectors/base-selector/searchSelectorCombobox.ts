import type { MutableRefObject, Ref } from 'react';
import {
  createTypedCombobox,
  type ComboboxChangeEventDetails,
  type PharmaComboboxClassNames,
} from '@/components/combobox';

export const SearchSelectorCombobox = createTypedCombobox<unknown>();
export const searchSelectorHighlightClassName = 'bg-slate-100';
export const searchSelectorClassNames = {
  optionHighlight: searchSelectorHighlightClassName,
} satisfies PharmaComboboxClassNames;
export const selectorPopupTransition =
  'transition-[left,top] duration-150 ease-out';
export const forwardedSelectorKeys = new Set([
  'ArrowDown',
  'ArrowUp',
  'PageDown',
  'PageUp',
  'Enter',
  'Escape',
]);

export const isPlainCharacterKey = (event: KeyboardEvent) =>
  event.key.length === 1 &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.isComposing;

export const blockOriginalKeyEvent = (event: KeyboardEvent) => {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

export const createSelectorComboboxDetails = (
  reason: ComboboxChangeEventDetails['reason'],
  event?: Event
): ComboboxChangeEventDetails => {
  let canceled = false;

  return {
    cancel: () => {
      canceled = true;
    },
    event,
    get isCanceled() {
      return canceled;
    },
    reason,
  };
};

export const setReactRef = <Element>(
  ref: Ref<Element> | undefined,
  value: Element | null
) => {
  if (!ref) return;

  if (typeof ref === 'function') {
    ref(value);
    return;
  }

  (ref as MutableRefObject<Element | null>).current = value;
};

export const getSelectedValue = <T>(
  items: readonly T[],
  defaultSelectedIndex: number | undefined
) => {
  if (defaultSelectedIndex === undefined || items.length === 0) return null;

  const boundedIndex = Math.min(
    Math.max(defaultSelectedIndex, 0),
    items.length - 1
  );

  return items[boundedIndex] ?? null;
};
