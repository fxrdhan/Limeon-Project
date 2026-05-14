import { useCallback } from 'react';
import type React from 'react';
import {
  createComboboxEventDetails as createEventDetails,
  type ComboboxChangeEventDetails,
  type ComboboxEventReason as EventReason,
} from '../utils/primitive-events';

export function useComboboxRootFormReset<Value>({
  defaultHighlightedIndex,
  defaultInputValue,
  defaultOpen,
  defaultValue,
  inputValue,
  inputValueControlled,
  isItemEqualToValue,
  onInputValueChange,
  onOpenChange,
  onValueChange,
  open,
  openControlled,
  selectedValue,
  setActiveIndex,
  setUncontrolledInputValue,
  setUncontrolledOpen,
  setUncontrolledValue,
  valueControlled,
}: {
  defaultHighlightedIndex: number | null;
  defaultInputValue: string;
  defaultOpen: boolean;
  defaultValue: Value | null;
  inputValue: string;
  inputValueControlled: boolean;
  isItemEqualToValue: (itemValue: Value, value: Value) => boolean;
  onInputValueChange?: (
    inputValue: string,
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  onOpenChange?: (
    open: boolean,
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  onValueChange?: (
    value: Value | null,
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  open: boolean;
  openControlled: boolean;
  selectedValue: Value | null;
  setActiveIndex: (
    index: number | null,
    reason: EventReason,
    event?: React.SyntheticEvent | Event
  ) => void;
  setUncontrolledInputValue: React.Dispatch<React.SetStateAction<string>>;
  setUncontrolledOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setUncontrolledValue: React.Dispatch<React.SetStateAction<Value | null>>;
  valueControlled: boolean;
}) {
  const isSelectedValueEqual = useCallback(
    (currentValue: Value | null, nextValue: Value | null) => {
      if (currentValue === null || nextValue === null) {
        return currentValue === nextValue;
      }

      return isItemEqualToValue(currentValue, nextValue);
    },
    [isItemEqualToValue]
  );

  return useCallback(
    (event: Event) => {
      if (event.defaultPrevented) return;

      if (!isSelectedValueEqual(selectedValue, defaultValue)) {
        const details = createEventDetails('form-reset', event);
        onValueChange?.(defaultValue, details);
        if (!details.isCanceled && !valueControlled) {
          setUncontrolledValue(defaultValue);
        }
      } else if (!valueControlled) {
        setUncontrolledValue(defaultValue);
      }

      if (inputValue !== defaultInputValue) {
        const details = createEventDetails('form-reset', event);
        onInputValueChange?.(defaultInputValue, details);
        if (!details.isCanceled && !inputValueControlled) {
          setUncontrolledInputValue(defaultInputValue);
        }
      } else if (!inputValueControlled) {
        setUncontrolledInputValue(defaultInputValue);
      }

      if (open !== defaultOpen) {
        const details = createEventDetails('form-reset', event);
        onOpenChange?.(defaultOpen, details);
        if (!details.isCanceled && !openControlled) {
          setUncontrolledOpen(defaultOpen);
        }
      } else if (!openControlled) {
        setUncontrolledOpen(defaultOpen);
      }

      setActiveIndex(defaultHighlightedIndex, 'form-reset', event);
    },
    [
      defaultHighlightedIndex,
      defaultInputValue,
      defaultOpen,
      defaultValue,
      inputValue,
      inputValueControlled,
      isSelectedValueEqual,
      onInputValueChange,
      onOpenChange,
      onValueChange,
      open,
      openControlled,
      selectedValue,
      setActiveIndex,
      setUncontrolledInputValue,
      setUncontrolledOpen,
      setUncontrolledValue,
      valueControlled,
    ]
  );
}
