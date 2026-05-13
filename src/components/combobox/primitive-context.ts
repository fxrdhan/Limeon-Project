import { createContext, useContext, useMemo } from 'react';
import type React from 'react';
import type { ComboboxEventReason as EventReason } from './utils/primitive-events';

export type ComboboxItemMeta<Value> = {
  disabled: boolean;
  value: Value;
};

export type ComboboxStaticContextValue = {
  defaultLabelId: string;
  defaultTriggerId: string;
  getItemId: (index: number) => string;
  highlightedIndexRef: React.MutableRefObject<number | null>;
  inputId: string;
  listboxId: string;
  popupRef: React.RefObject<HTMLElement | null>;
  triggerRef: React.RefObject<HTMLElement | null>;
};

export type ComboboxStateContextValue<Value> = {
  activeIndex: number | null;
  autoComplete?: string;
  autoHighlight: boolean;
  disabled: boolean;
  filteredItems: Value[];
  form?: string;
  highlightItemOnHover: boolean;
  inputValue: string;
  labelId?: string;
  name?: string;
  open: boolean;
  readOnly: boolean;
  required: boolean;
  selectedValue: Value | null;
  triggerId: string;
};

export type ComboboxActionsContextValue<Value> = {
  getNextEnabledIndex: (
    direction: 1 | -1,
    fromIndex: number | null
  ) => number | null;
  isItemDisabled: (item: Value) => boolean;
  isItemIndexDisabled: (index: number) => boolean;
  isItemEqualToValue: (item: Value, value: Value) => boolean;
  itemToStringLabel: (item: Value) => string;
  itemToStringValue: (item: Value) => string;
  registerItem: (index: number, meta: ComboboxItemMeta<Value>) => () => void;
  registerLabelId: (id: string) => () => void;
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
  setOpen: (
    open: boolean,
    reason: EventReason,
    event?: React.SyntheticEvent | Event
  ) => boolean;
  setTriggerId: (id: string) => void;
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
};

export type ComboboxContextValue<Value> = ComboboxStaticContextValue &
  ComboboxStateContextValue<Value> &
  ComboboxActionsContextValue<Value>;

export type ComboboxRootContextValue<Value> = {
  actions: ComboboxActionsContextValue<Value>;
  state: ComboboxStateContextValue<Value>;
  staticContext: ComboboxStaticContextValue;
};

export const ComboboxStaticContext =
  createContext<ComboboxStaticContextValue | null>(null);
export const ComboboxStateContext =
  createContext<ComboboxStateContextValue<unknown> | null>(null);
export const ComboboxActionsContext =
  createContext<ComboboxActionsContextValue<unknown> | null>(null);

const missingContextError =
  'Combobox components must be used inside Combobox.Root';

export const useComboboxStaticContext = () => {
  const context = useContext(ComboboxStaticContext);
  if (!context) {
    throw new Error(missingContextError);
  }

  return context;
};

export const useComboboxStateContext = <Value>() => {
  const context = useContext(ComboboxStateContext);
  if (!context) {
    throw new Error(missingContextError);
  }

  return context as ComboboxStateContextValue<Value>;
};

export const useComboboxActionsContext = <Value>() => {
  const context = useContext(ComboboxActionsContext);
  if (!context) {
    throw new Error(missingContextError);
  }

  return context as ComboboxActionsContextValue<Value>;
};

export const useComboboxContext = <Value>() => {
  const staticContext = useComboboxStaticContext();
  const state = useComboboxStateContext<Value>();
  const actions = useComboboxActionsContext<Value>();

  return useMemo<ComboboxContextValue<Value>>(
    () => ({
      ...staticContext,
      ...state,
      ...actions,
    }),
    [actions, state, staticContext]
  );
};
