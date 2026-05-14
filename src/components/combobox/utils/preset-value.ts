export type ComboboxValueIsEmpty<Item> = (item: Item | null) => boolean;

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

export const getDuplicateComboboxOptionValue = <Item>(
  items: readonly Item[],
  itemToStringValue: (item: Item) => string
) => {
  const seenValues = new Set<string>();

  for (const item of items) {
    const itemValue = itemToStringValue(item);
    if (seenValues.has(itemValue)) return itemValue;

    seenValues.add(itemValue);
  }

  return null;
};
