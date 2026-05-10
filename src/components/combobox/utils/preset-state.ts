type ItemLabelGetter<Item> = (item: Item) => string;
export type ComboboxValueIsEmpty<Item> = (item: Item | null) => boolean;

export type ComboboxSearchState<Item> = {
  hasExactItem: boolean;
  visibleItems: Item[];
};

const normalizeComboboxSearchText = (value: string) =>
  value.toLocaleLowerCase('id-ID');

export const getComboboxControlName = ({
  label,
  name,
  placeholder,
}: {
  label?: string;
  name?: string;
  placeholder: string;
}) =>
  label?.trim() ||
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

export const getComboboxSearchState = <Item>(
  items: Item[],
  normalizedInputValue: string,
  itemToStringLabel: ItemLabelGetter<Item>
): ComboboxSearchState<Item> => {
  if (!normalizedInputValue) {
    return {
      hasExactItem: false,
      visibleItems: items,
    };
  }

  const normalizedSearch = normalizeComboboxSearchText(normalizedInputValue);
  const visibleItems: Item[] = [];
  let hasExactItem = false;

  for (const item of items) {
    const normalizedLabel = normalizeComboboxSearchText(
      itemToStringLabel(item)
    );
    if (normalizedLabel.includes(normalizedSearch)) {
      visibleItems.push(item);
    }
    if (normalizedLabel === normalizedSearch) {
      hasExactItem = true;
    }
  }

  return {
    hasExactItem,
    visibleItems,
  };
};
