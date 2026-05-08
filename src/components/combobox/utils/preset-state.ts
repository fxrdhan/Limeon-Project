type ItemLabelGetter<Item> = (item: Item) => string;
export type ComboboxValueIsEmpty<Item> = (item: Item | null) => boolean;

export const getComboboxControlName = ({
  label,
  name,
  placeholder,
}: {
  label?: string;
  name: string;
  placeholder: string;
}) =>
  label?.trim() ||
  placeholder.replace(/^-+\s*|\s*-+$/g, '').trim() ||
  name.replace(/[_-]+/g, ' ');

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
  itemToStringLabel(item)
    .toLocaleLowerCase('id-ID')
    .includes(search.toLocaleLowerCase('id-ID'));

export const getVisibleComboboxItems = <Item>(
  items: Item[],
  normalizedInputValue: string,
  itemToStringLabel: ItemLabelGetter<Item>
) =>
  normalizedInputValue
    ? items.filter(item =>
        matchesComboboxSearch(item, normalizedInputValue, itemToStringLabel)
      )
    : items;

export const hasExactComboboxItem = <Item>(
  items: Item[],
  normalizedInputValue: string,
  itemToStringLabel: ItemLabelGetter<Item>
) =>
  items.some(
    item =>
      itemToStringLabel(item).toLocaleLowerCase('id-ID') ===
      normalizedInputValue.toLocaleLowerCase('id-ID')
  );
