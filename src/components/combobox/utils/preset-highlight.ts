type ComboboxHighlightIndexOptions<Item> = {
  isItemDisabled: (item: Item) => boolean;
  isSameItem: (item: Item, value: Item) => boolean;
  items: readonly Item[];
  selectedValue: Item | null;
};

type ComboboxEffectiveHighlightIndexOptions<Item> =
  ComboboxHighlightIndexOptions<Item> & {
    actualOpen: boolean;
    highlightedIndex: number | null;
  };

type PrintableSearchKeyEvent = {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
};

export const isComboboxListNavigationKey = (key: string) =>
  key === 'ArrowDown' ||
  key === 'ArrowUp' ||
  key === 'PageDown' ||
  key === 'PageUp';

export const isComboboxPrintableSearchKey = ({
  altKey,
  ctrlKey,
  key,
  metaKey,
}: PrintableSearchKeyEvent) =>
  key.length === 1 && key !== ' ' && !altKey && !ctrlKey && !metaKey;

export const getComboboxSelectedHighlightIndex = <Item>({
  isItemDisabled,
  isSameItem,
  items,
  selectedValue,
}: ComboboxHighlightIndexOptions<Item>) => {
  if (selectedValue === null) return null;

  const selectedIndex = items.findIndex(
    item => isSameItem(item, selectedValue) && !isItemDisabled(item)
  );

  return selectedIndex >= 0 ? selectedIndex : null;
};

export const getComboboxDefaultHighlightIndex = <Item>({
  isItemDisabled,
  isSameItem,
  items,
  selectedValue,
}: ComboboxHighlightIndexOptions<Item>) => {
  const selectedIndex = getComboboxSelectedHighlightIndex({
    isItemDisabled,
    isSameItem,
    items,
    selectedValue,
  });
  if (selectedIndex !== null) return selectedIndex;

  const firstEnabledIndex = items.findIndex(item => !isItemDisabled(item));

  return firstEnabledIndex >= 0 ? firstEnabledIndex : null;
};

export const getComboboxEffectiveHighlightIndex = <Item>({
  actualOpen,
  highlightedIndex,
  isItemDisabled,
  isSameItem,
  items,
  selectedValue,
}: ComboboxEffectiveHighlightIndexOptions<Item>) => {
  if (!actualOpen) return null;

  const highlightedItem =
    highlightedIndex === null ? undefined : items[highlightedIndex];
  if (highlightedItem !== undefined && !isItemDisabled(highlightedItem)) {
    return highlightedIndex;
  }

  return getComboboxDefaultHighlightIndex({
    isItemDisabled,
    isSameItem,
    items,
    selectedValue,
  });
};
