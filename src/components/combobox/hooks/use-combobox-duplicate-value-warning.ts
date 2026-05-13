import { useEffect, useMemo } from 'react';
import { getDuplicateComboboxOptionValue } from '../utils/preset-state';

const warnedDuplicateValues = new Set<string>();

const shouldWarnDuplicateComboboxValue =
  import.meta.env.DEV || import.meta.env.MODE === 'test';

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

  useEffect(() => {
    if (!shouldWarnDuplicateComboboxValue || duplicateValue === null) return;

    const comboboxName = name ?? 'unnamed combobox';
    const warningKey = `${comboboxName}::${duplicateValue}`;
    if (warnedDuplicateValues.has(warningKey)) return;

    warnedDuplicateValues.add(warningKey);
    console.warn(
      `[PharmaComboboxSelect] Duplicate item.toValue "${duplicateValue}" detected for ${comboboxName}. Options remain selectable, but submitted values should be unique to avoid ambiguous form data.`
    );
  }, [duplicateValue, name]);
}
