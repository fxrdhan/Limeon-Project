import { useMemo } from 'react';
import { getDuplicateComboboxOptionValue } from '../utils/preset-state';

export function useComboboxDuplicateValueInvariant<Item>({
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

  if (duplicateValue !== null) {
    throw new Error(
      `[PharmaComboboxSelect] Duplicate itemToStringValue "${duplicateValue}" detected for ${
        name ?? 'unnamed combobox'
      }. Combobox option values must be unique because hidden form submission uses itemToStringValue.`
    );
  }
}
