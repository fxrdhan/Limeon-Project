import { useEffect, useRef } from 'react';
import { getDuplicateComboboxOptionValue } from '../utils/preset-state';

export function useComboboxDuplicateValueWarning<Item>({
  itemToStringValue,
  items,
  name,
}: {
  itemToStringValue: (item: Item) => string;
  items: Item[];
  name?: string;
}) {
  const warnedDuplicateValueRef = useRef<string | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const duplicateValue = getDuplicateComboboxOptionValue(
      items,
      itemToStringValue
    );
    if (duplicateValue === null) {
      warnedDuplicateValueRef.current = null;
      return;
    }

    const warningKey = `${name ?? ''}:${duplicateValue}`;
    if (warnedDuplicateValueRef.current === warningKey) return;

    warnedDuplicateValueRef.current = warningKey;
    console.warn(
      `[PharmaComboboxSelect] Duplicate itemToStringValue "${duplicateValue}" detected for ${
        name ?? 'unnamed combobox'
      }. Combobox option values must be unique because hidden form submission uses itemToStringValue.`
    );
  }, [itemToStringValue, items, name]);
}
