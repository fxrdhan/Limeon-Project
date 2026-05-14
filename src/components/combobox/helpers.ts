export const findComboboxItemByValue = <Item>(
  items: readonly Item[],
  value: string,
  itemToStringValue: (item: Item) => string
) => items.find(item => itemToStringValue(item) === value) ?? null;
