import { useCallback } from 'react';
import type React from 'react';
import {
  createComboboxEventDetails as createEventDetails,
  createComboboxHighlightEventDetails as createHighlightEventDetails,
  type ComboboxChangeEventDetails,
  type ComboboxEventReason as EventReason,
  type ComboboxHighlightEventDetails,
} from '../utils/primitive-events';
import { normalizeComboboxHighlightedIndex } from '../utils/primitive-root';

export function useComboboxRootTransitions<Value>({
  activeIndexRef,
  filteredItemsRef,
  highlightedIndexControlled,
  inputValue,
  inputValueControlled,
  isItemEqualToValue,
  onHighlightedIndexChange,
  onInputValueChange,
  onItemHighlighted,
  onOpenChange,
  open,
  openControlled,
  setUncontrolledHighlightedIndex,
  setUncontrolledInputValue,
  setUncontrolledOpen,
}: {
  activeIndexRef: React.MutableRefObject<number | null>;
  filteredItemsRef: React.MutableRefObject<Value[]>;
  highlightedIndexControlled: boolean;
  inputValue: string;
  inputValueControlled: boolean;
  isItemEqualToValue: (itemValue: Value, value: Value) => boolean;
  onHighlightedIndexChange?: (
    highlightedIndex: number | null,
    eventDetails: ComboboxHighlightEventDetails
  ) => void;
  onInputValueChange?: (
    inputValue: string,
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  onItemHighlighted?: (
    itemValue: Value | undefined,
    eventDetails: ComboboxHighlightEventDetails
  ) => void;
  onOpenChange?: (
    open: boolean,
    eventDetails: ComboboxChangeEventDetails
  ) => void;
  open: boolean;
  openControlled: boolean;
  setUncontrolledHighlightedIndex: React.Dispatch<
    React.SetStateAction<number | null>
  >;
  setUncontrolledInputValue: React.Dispatch<React.SetStateAction<string>>;
  setUncontrolledOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const setOpen = useCallback(
    (
      nextOpen: boolean,
      reason: EventReason,
      event?: React.SyntheticEvent | Event
    ) => {
      if (open === nextOpen) return true;

      const details = createEventDetails(reason, event);
      onOpenChange?.(nextOpen, details);
      if (details.isCanceled) return false;
      if (!openControlled) setUncontrolledOpen(nextOpen);
      return true;
    },
    [onOpenChange, open, openControlled, setUncontrolledOpen]
  );

  const setInputValue = useCallback(
    (
      nextValue: string,
      reason: EventReason,
      event?: React.SyntheticEvent | Event
    ) => {
      if (inputValue === nextValue) return true;

      const details = createEventDetails(reason, event);
      onInputValueChange?.(nextValue, details);
      if (details.isCanceled) return false;
      if (!inputValueControlled) setUncontrolledInputValue(nextValue);
      return true;
    },
    [
      inputValue,
      inputValueControlled,
      onInputValueChange,
      setUncontrolledInputValue,
    ]
  );

  const setActiveIndex = useCallback(
    (
      nextIndex: number | null,
      reason: EventReason,
      event?: React.SyntheticEvent | Event
    ) => {
      const normalizedIndex = normalizeComboboxHighlightedIndex(
        nextIndex,
        filteredItemsRef.current.length
      );
      const nextValue =
        normalizedIndex === null
          ? undefined
          : filteredItemsRef.current[normalizedIndex];
      const currentIndex = activeIndexRef.current;
      const currentValue =
        currentIndex === null
          ? undefined
          : filteredItemsRef.current[currentIndex];
      const sameIndex = currentIndex === normalizedIndex;
      const sameValue =
        currentValue === undefined || nextValue === undefined
          ? currentValue === nextValue
          : isItemEqualToValue(currentValue, nextValue);

      if (sameIndex && sameValue) return;

      const details = createHighlightEventDetails(
        reason,
        normalizedIndex ?? -1,
        event
      );
      onItemHighlighted?.(nextValue, details);
      if (details.isCanceled) return;
      onHighlightedIndexChange?.(normalizedIndex, details);
      if (details.isCanceled) return;

      activeIndexRef.current = normalizedIndex;
      if (!highlightedIndexControlled) {
        setUncontrolledHighlightedIndex(normalizedIndex);
      }
    },
    [
      activeIndexRef,
      filteredItemsRef,
      highlightedIndexControlled,
      isItemEqualToValue,
      onHighlightedIndexChange,
      onItemHighlighted,
      setUncontrolledHighlightedIndex,
    ]
  );

  return {
    setActiveIndex,
    setInputValue,
    setOpen,
  };
}
