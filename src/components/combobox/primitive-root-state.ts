import { useMemo } from 'react';
import type React from 'react';
import type {
  ComboboxActionsContextValue,
  ComboboxRootContextValue,
  ComboboxStateContextValue,
  ComboboxStaticContextValue,
} from './primitive-context';
import { useComboboxRootAutoHighlight } from './hooks/use-combobox-root-auto-highlight';
import { useComboboxRootCollection } from './hooks/use-combobox-root-collection';
import { useComboboxRootDismissal } from './hooks/use-combobox-root-dismissal';
import { useComboboxRootFilteredItems } from './hooks/use-combobox-root-filtered-items';
import { useComboboxRootFormReset } from './hooks/use-combobox-root-form-reset';
import { useComboboxRootFormatters } from './hooks/use-combobox-root-formatters';
import { useComboboxRootIds } from './hooks/use-combobox-root-ids';
import { useComboboxRootLabelRegistry } from './hooks/use-combobox-root-label-registry';
import { useComboboxRootRefs } from './hooks/use-combobox-root-refs';
import { useComboboxRootSelection } from './hooks/use-combobox-root-selection';
import { useComboboxRootTransitions } from './hooks/use-combobox-root-transitions';
import { useControllableComboboxRootState } from './hooks/use-controllable-combobox-root-state';
import type {
  ComboboxChangeEventDetails,
  ComboboxHighlightEventDetails,
} from './utils/primitive-events';

export type ComboboxRootProps<Value> = {
  autoComplete?: string;
  autoHighlight?: boolean;
  children?: React.ReactNode;
  defaultHighlightedIndex?: number | null;
  defaultInputValue?: string;
  defaultOpen?: boolean;
  defaultValue?: Value | null;
  disabled?: boolean;
  filter?:
    | null
    | ((
        itemValue: Value,
        query: string,
        itemToString?: (itemValue: Value) => string
      ) => boolean);
  filteredItems?: readonly Value[];
  form?: string;
  highlightItemOnHover?: boolean;
  highlightedIndex?: number | null;
  inputValue?: string;
  isItemDisabled?: (itemValue: Value) => boolean;
  isItemEqualToValue?: (itemValue: Value, value: Value) => boolean;
  itemToStringLabel?: (itemValue: Value) => string;
  itemToStringValue?: (itemValue: Value) => string;
  labelId?: string;
  items?: readonly Value[];
  name?: string;
  onInputValueChange?: (
    inputValue: string,
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  onRequiredInvalid?: (event: React.InvalidEvent<HTMLInputElement>) => void;
  onHighlightedIndexChange?: (
    highlightedIndex: number | null,
    eventDetails: ComboboxHighlightEventDetails
  ) => void;
  onItemHighlighted?: (
    itemValue: Value | undefined,
    eventDetails: ComboboxHighlightEventDetails
  ) => void;
  onOpenChange?: (
    open: boolean,
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  onValueChange?: (
    value: Value | null,
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  open?: boolean;
  readOnly?: boolean;
  required?: boolean;
  value?: Value | null;
};

export type ComboboxHiddenInputState = {
  disabled: boolean;
  form?: string;
  name?: string;
  onFormReset: (event: Event) => void;
  onRequiredInvalid?: (event: React.InvalidEvent<HTMLInputElement>) => void;
  readOnly: boolean;
  required: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  value: string;
};

type ComboboxRootStateProps<Value> = Omit<ComboboxRootProps<Value>, 'children'>;

export function useComboboxRootState<Value>({
  autoComplete,
  autoHighlight = false,
  defaultInputValue = '',
  defaultHighlightedIndex = null,
  defaultOpen = false,
  defaultValue = null,
  disabled = false,
  filter,
  filteredItems: filteredItemsProp,
  form,
  highlightItemOnHover = true,
  highlightedIndex: highlightedIndexProp,
  inputValue: inputValueProp,
  isItemDisabled: isItemDisabledProp,
  isItemEqualToValue: isItemEqualToValueProp,
  itemToStringLabel: itemToStringLabelProp,
  itemToStringValue: itemToStringValueProp,
  labelId: labelIdProp,
  items = [],
  name,
  onHighlightedIndexChange,
  onInputValueChange,
  onItemHighlighted,
  onOpenChange,
  onRequiredInvalid,
  onValueChange,
  open: openProp,
  readOnly = false,
  required = false,
  value: valueProp,
}: ComboboxRootStateProps<Value>) {
  const {
    defaultLabelId,
    defaultTriggerId,
    getItemId,
    inputId,
    listboxId,
    setTriggerId,
    triggerId,
  } = useComboboxRootIds();
  const { popupRef, triggerRef } = useComboboxRootRefs();
  const {
    isItemDisabled,
    isItemEqualToValue,
    itemToStringLabel,
    itemToStringValue,
  } = useComboboxRootFormatters({
    isItemDisabled: isItemDisabledProp,
    isItemEqualToValue: isItemEqualToValueProp,
    itemToStringLabel: itemToStringLabelProp,
    itemToStringValue: itemToStringValueProp,
  });
  const state = useControllableComboboxRootState({
    defaultHighlightedIndex,
    defaultInputValue,
    defaultOpen,
    defaultValue,
    highlightedIndex: highlightedIndexProp,
    inputValue: inputValueProp,
    open: openProp,
    value: valueProp,
  });
  const filteredItems = useComboboxRootFilteredItems({
    filter,
    filteredItems: filteredItemsProp,
    inputValue: state.inputValue,
    itemToStringLabel,
    items,
  });
  const {
    activeIndexRef,
    activeIndexState,
    filteredItemsRef,
    getNextEnabledComboboxIndex,
    isItemIndexDisabled,
    registerItem,
  } = useComboboxRootCollection({
    filteredItems,
    highlightedIndex: state.highlightedIndex,
    isItemDisabled,
  });
  const { labelId, registerLabelId } = useComboboxRootLabelRegistry({
    labelId: labelIdProp,
  });
  const { setActiveIndex, setInputValue, setOpen } = useComboboxRootTransitions(
    {
      activeIndexRef,
      filteredItemsRef,
      highlightedIndexControlled: state.isHighlightedIndexControlled,
      inputValue: state.inputValue,
      inputValueControlled: state.isInputValueControlled,
      isItemEqualToValue,
      onHighlightedIndexChange,
      onInputValueChange,
      onItemHighlighted,
      onOpenChange,
      open: state.open,
      openControlled: state.isOpenControlled,
      setUncontrolledHighlightedIndex: state.setUncontrolledHighlightedIndex,
      setUncontrolledInputValue: state.setUncontrolledInputValue,
      setUncontrolledOpen: state.setUncontrolledOpen,
    }
  );
  const { selectActiveItem, selectItem } = useComboboxRootSelection({
    activeIndexRef,
    disabled,
    filteredItemsRef,
    isItemDisabled,
    isItemIndexDisabled,
    onValueChange,
    readOnly,
    setOpen,
    setUncontrolledValue: state.setUncontrolledValue,
    valueControlled: state.isValueControlled,
  });
  const handleFormReset = useComboboxRootFormReset({
    defaultHighlightedIndex,
    defaultInputValue,
    defaultOpen,
    defaultValue,
    inputValue: state.inputValue,
    inputValueControlled: state.isInputValueControlled,
    isItemEqualToValue,
    onInputValueChange,
    onOpenChange,
    onValueChange,
    open: state.open,
    openControlled: state.isOpenControlled,
    selectedValue: state.selectedValue,
    setActiveIndex,
    setUncontrolledInputValue: state.setUncontrolledInputValue,
    setUncontrolledOpen: state.setUncontrolledOpen,
    setUncontrolledValue: state.setUncontrolledValue,
    valueControlled: state.isValueControlled,
  });

  useComboboxRootDismissal({
    open: state.open,
    popupRef,
    setOpen,
    triggerRef,
  });
  useComboboxRootAutoHighlight({
    activeIndexRef,
    autoHighlight,
    filteredItemCount: filteredItems.length,
    isItemIndexDisabled,
    open: state.open,
    setActiveIndex,
  });

  // Stable context slice: refs and IDs that never change identity after mount.
  // Memoized with [] to make the stability contract explicit and reduce the
  // reactive dependency array below.
  const staticContext = useMemo<ComboboxStaticContextValue>(
    () => ({
      defaultLabelId,
      defaultTriggerId,
      getItemId,
      highlightedIndexRef: activeIndexRef,
      inputId,
      listboxId,
      popupRef,
      triggerRef,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs and useId values are stable
    []
  );

  const actions = useMemo<ComboboxActionsContextValue<Value>>(
    () => ({
      getNextEnabledIndex: getNextEnabledComboboxIndex,
      isItemDisabled,
      isItemIndexDisabled,
      isItemEqualToValue,
      itemToStringLabel,
      itemToStringValue,
      registerItem,
      registerLabelId,
      selectActiveItem,
      selectItem,
      setActiveIndex,
      setInputValue,
      setOpen,
      setTriggerId,
    }),
    [
      getNextEnabledComboboxIndex,
      isItemDisabled,
      isItemIndexDisabled,
      isItemEqualToValue,
      itemToStringLabel,
      itemToStringValue,
      registerItem,
      registerLabelId,
      selectActiveItem,
      selectItem,
      setActiveIndex,
      setInputValue,
      setOpen,
      setTriggerId,
    ]
  );

  const stateContext = useMemo<ComboboxStateContextValue<Value>>(
    () => ({
      activeIndex: activeIndexState,
      autoComplete,
      autoHighlight,
      disabled,
      filteredItems,
      form,
      highlightItemOnHover,
      inputValue: state.inputValue,
      labelId,
      name,
      open: state.open,
      readOnly,
      required,
      selectedValue: state.selectedValue,
      triggerId,
    }),
    [
      activeIndexState,
      autoComplete,
      autoHighlight,
      disabled,
      filteredItems,
      form,
      highlightItemOnHover,
      labelId,
      name,
      readOnly,
      required,
      state.inputValue,
      state.open,
      state.selectedValue,
      triggerId,
    ]
  );

  const context = useMemo<ComboboxRootContextValue<Value>>(
    () => ({
      actions,
      state: stateContext,
      staticContext,
    }),
    [actions, stateContext, staticContext]
  );

  const hiddenValue =
    state.selectedValue === null ? '' : itemToStringValue(state.selectedValue);
  const hiddenInputProps = useMemo<ComboboxHiddenInputState>(
    () => ({
      disabled,
      form,
      name,
      onFormReset: handleFormReset,
      onRequiredInvalid,
      readOnly,
      required,
      triggerRef,
      value: hiddenValue,
    }),
    [
      disabled,
      form,
      hiddenValue,
      handleFormReset,
      name,
      onRequiredInvalid,
      readOnly,
      required,
      triggerRef,
    ]
  );

  return {
    context,
    hiddenInputProps,
  };
}
