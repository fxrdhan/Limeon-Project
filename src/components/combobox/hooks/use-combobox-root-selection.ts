import { useCallback } from 'react';
import type React from 'react';
import {
  createComboboxEventDetails as createEventDetails,
  type ComboboxChangeEventDetails,
  type ComboboxEventReason as EventReason,
} from '../utils/primitive-events';

export function useComboboxRootSelection<Value>({
  activeIndexRef,
  disabled,
  filteredItemsRef,
  isItemDisabled,
  isItemIndexDisabled,
  onValueChange,
  readOnly,
  setOpen,
  setUncontrolledValue,
  valueControlled,
}: {
  activeIndexRef: React.MutableRefObject<number | null>;
  disabled: boolean;
  filteredItemsRef: React.MutableRefObject<Value[]>;
  isItemDisabled: (itemValue: Value) => boolean;
  isItemIndexDisabled: (index: number) => boolean;
  onValueChange?: (
    value: Value | null,
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  readOnly: boolean;
  setOpen: (
    open: boolean,
    reason: EventReason,
    event?: React.SyntheticEvent | Event
  ) => boolean;
  setUncontrolledValue: React.Dispatch<React.SetStateAction<Value | null>>;
  valueControlled: boolean;
}) {
  const selectItem = useCallback(
    (
      item: Value,
      reason: EventReason,
      event?: React.SyntheticEvent | Event,
      index?: number
    ) => {
      if (
        disabled ||
        readOnly ||
        (index !== undefined
          ? isItemIndexDisabled(index)
          : isItemDisabled(item))
      ) {
        return false;
      }

      const details = createEventDetails(reason, event);
      onValueChange?.(item, details);
      if (details.isCanceled) return false;
      if (!valueControlled) {
        setUncontrolledValue(item);
      }
      setOpen(false, reason, event);
      return true;
    },
    [
      disabled,
      isItemDisabled,
      isItemIndexDisabled,
      onValueChange,
      readOnly,
      setOpen,
      setUncontrolledValue,
      valueControlled,
    ]
  );
  const selectActiveItem = useCallback(
    (
      reason: EventReason,
      event?: React.SyntheticEvent | Event,
      options?: { preventDefault?: boolean }
    ) => {
      const activeIndex = activeIndexRef.current;
      if (activeIndex === null || isItemIndexDisabled(activeIndex))
        return false;

      const activeItem = filteredItemsRef.current[activeIndex];
      if (activeItem === undefined) return false;

      if (options?.preventDefault) event?.preventDefault();
      return selectItem(activeItem, reason, event, activeIndex);
    },
    [activeIndexRef, filteredItemsRef, isItemIndexDisabled, selectItem]
  );

  return {
    selectActiveItem,
    selectItem,
  };
}
