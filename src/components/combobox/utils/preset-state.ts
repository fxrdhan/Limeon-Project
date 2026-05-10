type ItemLabelGetter<Item> = (item: Item) => string;
export type ComboboxValueIsEmpty<Item> = (item: Item | null) => boolean;

export type ComboboxSearchEntry<Item> = {
  item: Item;
  normalizedLabel: string;
};

export type ComboboxSearchState<Item> = {
  hasExactItem: boolean;
  visibleItems: Item[];
};

const normalizeComboboxSearchText = (value: string) =>
  value.toLocaleLowerCase('id-ID');

export const getComboboxControlName = ({
  ariaLabel,
  label,
  name,
  placeholder,
}: {
  ariaLabel?: string;
  label?: string;
  name?: string;
  placeholder: string;
}) =>
  label?.trim() ||
  ariaLabel?.trim() ||
  name?.replace(/[_-]+/g, ' ') ||
  placeholder.replace(/^-+\s*|\s*-+$/g, '').trim() ||
  'combobox';

export const isComboboxValueEmpty = <Item>(
  item: Item | null,
  isValueEmpty?: ComboboxValueIsEmpty<Item>
) => item == null || Boolean(isValueEmpty?.(item));

export const getComboboxSelectedValue = <Item>(
  value: Item | null,
  isValueEmpty?: ComboboxValueIsEmpty<Item>
) => (isComboboxValueEmpty(value, isValueEmpty) ? null : value);

export const matchesComboboxSearch = <Item>(
  item: Item,
  search: string,
  itemToStringLabel: ItemLabelGetter<Item>
) =>
  normalizeComboboxSearchText(itemToStringLabel(item)).includes(
    normalizeComboboxSearchText(search)
  );

export const getComboboxSearchEntries = <Item>(
  items: Item[],
  itemToStringLabel: ItemLabelGetter<Item>
): ComboboxSearchEntry<Item>[] =>
  items.map(item => ({
    item,
    normalizedLabel: normalizeComboboxSearchText(itemToStringLabel(item)),
  }));

const getNormalizedComboboxVisibleItemLimit = (limit?: number) => {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0) {
    return undefined;
  }

  return Math.floor(limit);
};

const getLimitedComboboxItems = <Item>({
  isSameItem,
  items,
  limit,
  selectedValue,
}: {
  isSameItem: (item: Item, value: Item) => boolean;
  items: Item[];
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

export const getComboboxSearchState = <Item>({
  isSameItem,
  items,
  normalizedInputValue,
  searchEntries,
  selectedValue,
  visibleItemLimit,
}: {
  isSameItem: (item: Item, value: Item) => boolean;
  items: Item[];
  normalizedInputValue: string;
  searchEntries: ComboboxSearchEntry<Item>[];
  selectedValue: Item | null;
  visibleItemLimit?: number;
}): ComboboxSearchState<Item> => {
  const limit = getNormalizedComboboxVisibleItemLimit(visibleItemLimit);

  if (!normalizedInputValue) {
    return {
      hasExactItem: false,
      visibleItems: getLimitedComboboxItems({
        isSameItem,
        items,
        limit,
        selectedValue,
      }),
    };
  }

  const normalizedSearch = normalizeComboboxSearchText(normalizedInputValue);
  const visibleItems: Item[] = [];
  let selectedMatchBeyondLimit: Item | null = null;
  let hasExactItem = false;

  for (const { item, normalizedLabel } of searchEntries) {
    if (normalizedLabel.includes(normalizedSearch)) {
      if (limit === undefined || visibleItems.length < limit) {
        visibleItems.push(item);
      } else if (
        selectedValue !== null &&
        selectedMatchBeyondLimit === null &&
        isSameItem(item, selectedValue) &&
        !visibleItems.some(visibleItem =>
          isSameItem(visibleItem, selectedValue)
        )
      ) {
        selectedMatchBeyondLimit = item;
      }
    }
    if (normalizedLabel === normalizedSearch) {
      hasExactItem = true;
    }
  }

  if (selectedMatchBeyondLimit !== null && limit !== undefined) {
    if (limit === 1) {
      visibleItems[0] = selectedMatchBeyondLimit;
    } else {
      visibleItems[limit - 1] = selectedMatchBeyondLimit;
    }
  }

  return {
    hasExactItem,
    visibleItems,
  };
};
