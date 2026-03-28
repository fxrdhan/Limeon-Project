import type { Item } from '@/types/database';

const itemNameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

export const compareItemNameStrings = (
  left: string | null | undefined,
  right: string | null | undefined
) => itemNameCollator.compare(left?.trim() || '', right?.trim() || '');

export const compareItemsByDisplayName = (left: Item, right: Item) => {
  const primary = compareItemNameStrings(
    left.display_name || left.name,
    right.display_name || right.name
  );

  if (primary !== 0) {
    return primary;
  }

  return compareItemNameStrings(left.code, right.code);
};
