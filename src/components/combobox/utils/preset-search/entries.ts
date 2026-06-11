import type { ComboboxSearchEntry, ItemLabelGetter } from './types';
import {
  getComboboxAcronym,
  getComboboxConsonantSkeleton,
  normalizeComboboxSearchText,
  splitComboboxSearchWords,
} from './text';

export const getComboboxSearchEntries = <Item>(
  items: readonly Item[],
  itemToStringLabel: ItemLabelGetter<Item>
): ComboboxSearchEntry<Item>[] =>
  items.map((item, originalIndex) => {
    const label = itemToStringLabel(item);
    const normalizedWords = splitComboboxSearchWords(label);

    return {
      item,
      normalizedAcronym: getComboboxAcronym(normalizedWords),
      normalizedCompactLabel: normalizedWords.join(''),
      normalizedConsonantSkeleton: getComboboxConsonantSkeleton(label),
      normalizedLabel: normalizeComboboxSearchText(label),
      normalizedWords,
      originalIndex,
    };
  });
