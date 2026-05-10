const keyboardPageStep = 10;

export const comboboxTypeaheadResetDelay = 700;

export const getNextEnabledIndex = ({
  direction,
  fromIndex,
  isIndexDisabled,
  itemCount,
}: {
  direction: 1 | -1;
  fromIndex: number | null;
  isIndexDisabled: (index: number) => boolean;
  itemCount: number;
}) => {
  if (itemCount <= 0) return null;

  for (let offset = 1; offset <= itemCount; offset += 1) {
    const baseIndex = fromIndex ?? (direction === 1 ? -1 : itemCount);
    const nextIndex = (baseIndex + direction * offset + itemCount) % itemCount;
    if (!isIndexDisabled(nextIndex)) return nextIndex;
  }

  return null;
};

export const getPagedEnabledIndex = ({
  direction,
  fromIndex,
  getNextIndex,
}: {
  direction: 1 | -1;
  fromIndex: number | null;
  getNextIndex: (direction: 1 | -1, fromIndex: number | null) => number | null;
}) => {
  let nextIndex = fromIndex;
  const stepCount = fromIndex === null ? 1 : keyboardPageStep;

  for (let step = 0; step < stepCount; step += 1) {
    const candidate = getNextIndex(direction, nextIndex);
    if (candidate === null || candidate === nextIndex) break;
    nextIndex = candidate;
  }

  return nextIndex;
};

export const normalizeTypeaheadText = (value: string) =>
  value.trim().toLocaleLowerCase('id-ID');

export const getTypeaheadSearchText = (buffer: string) => {
  const characters = Array.from(buffer);
  if (
    characters.length > 1 &&
    characters.every(character => character === characters[0])
  ) {
    return characters[0] ?? '';
  }

  return buffer;
};

export const getTypeaheadIndex = <Value>({
  fromIndex,
  isIndexDisabled,
  itemToStringLabel,
  items,
  search,
}: {
  fromIndex: number | null;
  isIndexDisabled: (index: number) => boolean;
  itemToStringLabel: (item: Value) => string;
  items: Value[];
  search: string;
}) => {
  const normalizedSearch = normalizeTypeaheadText(search);
  if (!normalizedSearch || items.length === 0) return null;

  for (let offset = 1; offset <= items.length; offset += 1) {
    const baseIndex = fromIndex ?? -1;
    const nextIndex = (baseIndex + offset) % items.length;
    if (isIndexDisabled(nextIndex)) continue;

    const label = normalizeTypeaheadText(itemToStringLabel(items[nextIndex]));
    if (label.startsWith(normalizedSearch)) return nextIndex;
  }

  return null;
};
