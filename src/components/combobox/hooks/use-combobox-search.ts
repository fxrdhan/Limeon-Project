import { useMemo } from 'react';
import { getComboboxSearchState } from '../utils/preset-state';

export function useComboboxSearch<Item>({
  inputValue,
  itemToStringLabel,
  items,
}: {
  inputValue: string;
  itemToStringLabel: (item: Item) => string;
  items: Item[];
}) {
  const normalizedInputValue = inputValue.trim();
  const { hasExactItem, visibleItems } = useMemo(
    () =>
      getComboboxSearchState(items, normalizedInputValue, itemToStringLabel),
    [itemToStringLabel, items, normalizedInputValue]
  );

  return {
    hasExactItem,
    hasVisibleItems: visibleItems.length > 0,
    normalizedInputValue,
    visibleItems,
  };
}
