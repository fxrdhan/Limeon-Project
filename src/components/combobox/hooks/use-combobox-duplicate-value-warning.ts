import { useEffect, useMemo } from 'react';
import { getDuplicateComboboxOptionValue } from '../utils/preset-value';

const warnedDuplicateValues = new Set<string>();

const shouldWarnDuplicateComboboxValue =
  import.meta.env.DEV || import.meta.env.MODE === 'test';

const getDuplicateValueMessage = ({
  duplicateValue,
  name,
}: {
  duplicateValue: string;
  name?: string;
}) =>
  `[PharmaComboboxSelect] Duplicate item.toValue "${duplicateValue}" detected for ${
    name ?? 'unnamed combobox'
  }. Form-bound combobox values must be unique to avoid ambiguous submitted data.`;

export function useComboboxDuplicateValueWarning<Item>({
  itemToStringValue,
  items,
  name,
}: {
  itemToStringValue: (item: Item) => string;
  items: readonly Item[];
  name?: string;
}) {
  const duplicateValue = useMemo(
    () => getDuplicateComboboxOptionValue(items, itemToStringValue),
    [itemToStringValue, items]
  );

  if (name && duplicateValue !== null) {
    throw new Error(
      getDuplicateValueMessage({
        duplicateValue,
        name,
      })
    );
  }

  useEffect(() => {
    if (!shouldWarnDuplicateComboboxValue || duplicateValue === null) return;
    if (name) return;

    const warningKey = `unnamed::${duplicateValue}`;
    if (warnedDuplicateValues.has(warningKey)) return;

    warnedDuplicateValues.add(warningKey);
    console.warn(
      getDuplicateValueMessage({
        duplicateValue,
      })
    );
  }, [duplicateValue, name]);
}
