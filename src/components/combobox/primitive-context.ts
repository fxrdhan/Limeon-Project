import { createContext, useContext } from 'react';
import type React from 'react';
import type { ComboboxEventReason as EventReason } from './utils/primitive-events';

export type ComboboxItemMeta<Value> = {
  disabled: boolean;
  value: Value;
};

export type ComboboxContextValue<Value> = {
  activeIndex: number | null;
  autoComplete?: string;
  autoHighlight: boolean;
  defaultLabelId: string;
  defaultTriggerId: string;
  disabled: boolean;
  filteredItems: Value[];
  form?: string;
  getItemId: (index: number) => string;
  getNextEnabledIndex: (
    direction: 1 | -1,
    fromIndex: number | null
  ) => number | null;
  highlightedIndexRef: React.MutableRefObject<number | null>;
  highlightItemOnHover: boolean;
  inputId: string;
  inputValue: string;
  isItemDisabled: (item: Value) => boolean;
  isItemIndexDisabled: (index: number) => boolean;
  isItemEqualToValue: (item: Value, value: Value) => boolean;
  itemToStringLabel: (item: Value) => string;
  itemToStringValue: (item: Value) => string;
  labelId?: string;
  listboxId: string;
  name?: string;
  open: boolean;
  popupRef: React.RefObject<HTMLElement | null>;
  readOnly: boolean;
  registerItem: (index: number, meta: ComboboxItemMeta<Value>) => () => void;
  required: boolean;
  selectedValue: Value | null;
  setActiveIndex: (
    index: number | null,
    reason: EventReason,
    event?: React.SyntheticEvent | Event
  ) => void;
  setInputValue: (
    value: string,
    reason: EventReason,
    event?: React.SyntheticEvent | Event
  ) => boolean;
  registerLabelId: (id: string) => () => void;
  setOpen: (
    open: boolean,
    reason: EventReason,
    event?: React.SyntheticEvent | Event
  ) => boolean;
  selectItem: (
    item: Value,
    reason: EventReason,
    event?: React.SyntheticEvent | Event,
    index?: number
  ) => boolean;
  selectActiveItem: (
    reason: EventReason,
    event?: React.SyntheticEvent | Event,
    options?: {
      preventDefault?: boolean;
    }
  ) => boolean;
  setTriggerId: (id: string) => void;
  triggerId: string;
  triggerRef: React.RefObject<HTMLElement | null>;
};

export const ComboboxContext =
  createContext<ComboboxContextValue<unknown> | null>(null);

export const useComboboxContext = <Value>() => {
  const context = useContext(ComboboxContext);
  if (!context) {
    throw new Error('Combobox components must be used inside Combobox.Root');
  }

  return context as ComboboxContextValue<Value>;
};
