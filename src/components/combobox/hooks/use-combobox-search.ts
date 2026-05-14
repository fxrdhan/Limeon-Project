import { useMemo } from 'react';
import {
  getComboboxSearchEntries,
  getComboboxSearchState,
} from '../utils/preset-search';

export function useComboboxSearch<Item>({
  inputValue,
  isSameItem,
  itemToStringLabel,
  items,
  selectedValue,
  visibleItemLimit,
}: {
  inputValue: string;
  isSameItem: (item: Item, value: Item) => boolean;
  itemToStringLabel: (item: Item) => string;
  items: readonly Item[];
  selectedValue: Item | null;
  visibleItemLimit?: number;
}) {
  const normalizedInputValue = inputValue.trim();
  const searchEntries = useMemo(
    () => getComboboxSearchEntries(items, itemToStringLabel),
    [itemToStringLabel, items]
  );
  const { hasExactItem, visibleItems } = useMemo(
    () =>
      getComboboxSearchState({
        isSameItem,
        items,
        normalizedInputValue,
        searchEntries,
        selectedValue,
        visibleItemLimit,
      }),
    [
      isSameItem,
      items,
      normalizedInputValue,
      searchEntries,
      selectedValue,
      visibleItemLimit,
    ]
  );

  return {
    hasExactItem,
    hasVisibleItems: visibleItems.length > 0,
    normalizedInputValue,
    visibleItems,
  };
}
