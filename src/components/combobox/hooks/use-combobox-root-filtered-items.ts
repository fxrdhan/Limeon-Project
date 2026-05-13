import { useMemo } from 'react';

export function useComboboxRootFilteredItems<Value>({
  filter,
  filteredItems,
  inputValue,
  itemToStringLabel,
  items,
}: {
  filter?:
    | null
    | ((
        itemValue: Value,
        query: string,
        itemToString?: (itemValue: Value) => string
      ) => boolean);
  filteredItems?: readonly Value[];
  inputValue: string;
  itemToStringLabel: (itemValue: Value) => string;
  items: readonly Value[];
}) {
  return useMemo(() => {
    if (filteredItems !== undefined) return Array.from(filteredItems);
    if (filter === null || inputValue.trim() === '') return Array.from(items);

    const query = inputValue.trim();
    return Array.from(items).filter(item =>
      filter
        ? filter(item, query, itemToStringLabel)
        : itemToStringLabel(item)
            .toLocaleLowerCase('id-ID')
            .includes(query.toLocaleLowerCase('id-ID'))
    );
  }, [filter, filteredItems, inputValue, itemToStringLabel, items]);
}
