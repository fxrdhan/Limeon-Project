export const defaultComboboxLargeListVisibleItemLimit = 160;

const getNormalizedComboboxVisibleItemLimit = (limit?: number) => {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0) {
    return undefined;
  }

  return Math.floor(limit);
};

export const getEffectiveComboboxVisibleItemLimit = ({
  itemCount,
  visibleItemLimit,
}: {
  itemCount: number;
  visibleItemLimit?: number;
}) => {
  const explicitLimit = getNormalizedComboboxVisibleItemLimit(visibleItemLimit);
  if (explicitLimit !== undefined) return explicitLimit;

  return itemCount > defaultComboboxLargeListVisibleItemLimit
    ? defaultComboboxLargeListVisibleItemLimit
    : undefined;
};

export const getLimitedComboboxItems = <Item>({
  isSameItem,
  items,
  limit,
  selectedValue,
}: {
  isSameItem: (item: Item, value: Item) => boolean;
  items: readonly Item[];
  limit: number | undefined;
  selectedValue: Item | null;
}) => {
  if (limit === undefined || items.length <= limit) return items;

  const visibleItems = items.slice(0, limit);
  if (selectedValue === null) return visibleItems;

  const selectedIndex = items.findIndex(item =>
    isSameItem(item, selectedValue)
  );
  if (selectedIndex < 0 || selectedIndex < limit) return visibleItems;

  return limit === 1
    ? [items[selectedIndex] as Item]
    : [...items.slice(0, limit - 1), items[selectedIndex] as Item];
};
