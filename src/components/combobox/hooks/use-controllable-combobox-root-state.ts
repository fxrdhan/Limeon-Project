import { useState } from 'react';

export function useControllableComboboxRootState<Value>({
  defaultHighlightedIndex,
  defaultInputValue,
  defaultOpen,
  defaultValue,
  highlightedIndex,
  inputValue,
  open,
  value,
}: {
  defaultHighlightedIndex: number | null;
  defaultInputValue: string;
  defaultOpen: boolean;
  defaultValue: Value | null;
  highlightedIndex?: number | null;
  inputValue?: string;
  open?: boolean;
  value?: Value | null;
}) {
  const [uncontrolledInputValue, setUncontrolledInputValue] =
    useState(defaultInputValue);
  const [uncontrolledHighlightedIndex, setUncontrolledHighlightedIndex] =
    useState<number | null>(defaultHighlightedIndex);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [uncontrolledValue, setUncontrolledValue] = useState<Value | null>(
    defaultValue
  );
  const isHighlightedIndexControlled = highlightedIndex !== undefined;
  const isInputValueControlled = inputValue !== undefined;
  const isOpenControlled = open !== undefined;
  const isValueControlled = value !== undefined;
  const resolvedHighlightedIndex = isHighlightedIndexControlled
    ? highlightedIndex
    : uncontrolledHighlightedIndex;
  const resolvedInputValue = isInputValueControlled
    ? inputValue
    : uncontrolledInputValue;
  const resolvedOpen = isOpenControlled ? open : uncontrolledOpen;
  const resolvedSelectedValue = isValueControlled ? value : uncontrolledValue;

  return {
    highlightedIndex: resolvedHighlightedIndex as number | null,
    inputValue: resolvedInputValue as string,
    isHighlightedIndexControlled,
    isInputValueControlled,
    isOpenControlled,
    isValueControlled,
    open: resolvedOpen as boolean,
    selectedValue: resolvedSelectedValue as Value | null,
    setUncontrolledHighlightedIndex,
    setUncontrolledInputValue,
    setUncontrolledOpen,
    setUncontrolledValue,
  };
}
