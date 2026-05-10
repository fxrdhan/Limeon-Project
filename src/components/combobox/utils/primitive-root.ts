const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getDefaultComboboxItemLabel = <Value>(item: Value) => {
  if (isObjectRecord(item) && typeof item.label === 'string') return item.label;
  if (isObjectRecord(item) && typeof item.name === 'string') return item.name;
  return String(item);
};

export const getDefaultComboboxItemValue = <Value>(item: Value) => {
  if (isObjectRecord(item) && typeof item.value === 'string') return item.value;
  if (isObjectRecord(item) && typeof item.id === 'string') return item.id;
  return String(item);
};

export const normalizeComboboxHighlightedIndex = (
  index: number | null | undefined,
  itemCount: number
) =>
  index === null ||
  index === undefined ||
  !Number.isInteger(index) ||
  index < 0 ||
  index >= itemCount
    ? null
    : index;
