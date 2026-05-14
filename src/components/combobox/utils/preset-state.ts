type ItemLabelGetter<Item> = (item: Item) => string;
export type ComboboxValueIsEmpty<Item> = (item: Item | null) => boolean;

export type ComboboxSearchEntry<Item> = {
  item: Item;
  normalizedAcronym: string;
  normalizedCompactLabel: string;
  normalizedConsonantSkeleton: string;
  normalizedLabel: string;
  normalizedWords: string[];
  originalIndex: number;
};

export type ComboboxSearchState<Item> = {
  hasExactItem: boolean;
  visibleItems: readonly Item[];
};

const normalizeComboboxSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('id-ID')
    .trim()
    .replace(/\s+/g, ' ');

const splitComboboxSearchWords = (value: string) =>
  normalizeComboboxSearchText(value).match(/[a-z0-9]+/g) ?? [];

const compactComboboxSearchText = (value: string) =>
  splitComboboxSearchWords(value).join('');

const getComboboxConsonantSkeleton = (value: string) =>
  compactComboboxSearchText(value).replace(/[aiueo]/g, '');

const getComboboxAcronym = (words: string[]) =>
  words.map(word => word[0] ?? '').join('');

export const defaultComboboxLargeListVisibleItemLimit = 160;

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

const getNormalizedComboboxVisibleItemLimit = (limit?: number) => {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0) {
    return undefined;
  }

  return Math.floor(limit);
};

export const getEffectiveComboboxVisibleItemLimit = ({
  itemCount,
  visibleItemLimit,
}: {
  itemCount: number;
  visibleItemLimit?: number;
}) => {
  const explicitLimit = getNormalizedComboboxVisibleItemLimit(visibleItemLimit);
  if (explicitLimit !== undefined) return explicitLimit;

  return itemCount > defaultComboboxLargeListVisibleItemLimit
    ? defaultComboboxLargeListVisibleItemLimit
    : undefined;
};

const getLimitedComboboxItems = <Item>({
  isSameItem,
  items,
  limit,
  selectedValue,
}: {
  isSameItem: (item: Item, value: Item) => boolean;
  items: readonly Item[];
  limit: number | undefined;
  selectedValue: Item | null;
}) => {
  if (limit === undefined || items.length <= limit) return items;

  const visibleItems = items.slice(0, limit);
  if (selectedValue === null) return visibleItems;

  const selectedIndex = items.findIndex(item =>
    isSameItem(item, selectedValue)
  );
  if (selectedIndex < 0 || selectedIndex < limit) return visibleItems;

  return limit === 1
    ? [items[selectedIndex] as Item]
    : [...items.slice(0, limit - 1), items[selectedIndex] as Item];
};

type ComboboxSearchMatch = {
  distance: number;
  lengthDelta: number;
  originalIndex: number;
  position: number;
  tier: number;
};

type ComboboxMatchedSearchEntry<Item> = {
  entry: ComboboxSearchEntry<Item>;
  match: ComboboxSearchMatch;
};

const comboboxSearchTier = {
  exact: 0,
  prefix: 1,
  wordPrefix: 2,
  substring: 3,
  acronym: 4,
  consonantSkeleton: 5,
  subsequence: 6,
  typoFuzzy: 7,
} as const;

const getWordStartPosition = (words: string[], wordIndex: number) => {
  let position = 0;

  for (let index = 0; index < wordIndex; index += 1) {
    position += (words[index]?.length ?? 0) + 1;
  }

  return position;
};

const getWordPrefixPosition = (words: string[], searchWords: string[]) => {
  if (searchWords.length === 0 || searchWords.length > words.length)
    return null;

  for (
    let startIndex = 0;
    startIndex <= words.length - searchWords.length;
    startIndex += 1
  ) {
    const matches = searchWords.every((searchWord, offset) =>
      words[startIndex + offset]?.startsWith(searchWord)
    );

    if (matches) return getWordStartPosition(words, startIndex);
  }

  return null;
};

const getSubsequencePosition = (value: string, search: string) => {
  if (search.length < 2) return null;

  let searchIndex = 0;
  let firstMatchIndex: number | null = null;

  for (let valueIndex = 0; valueIndex < value.length; valueIndex += 1) {
    if (value[valueIndex] !== search[searchIndex]) continue;

    firstMatchIndex ??= valueIndex;
    searchIndex += 1;
    if (searchIndex === search.length) return firstMatchIndex;
  }

  return null;
};

const getTypoFuzzyMaxDistance = (searchLength: number) => {
  if (searchLength < 3) return 0;
  return searchLength < 5 ? 1 : 2;
};

const getBoundedEditDistance = (
  source: string,
  target: string,
  maxDistance: number
) => {
  if (Math.abs(source.length - target.length) > maxDistance) {
    return maxDistance + 1;
  }

  let previousRow = Array.from(
    { length: target.length + 1 },
    (_, index) => index
  );

  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    const currentRow = [sourceIndex];
    let rowMinimum = currentRow[0] as number;

    for (let targetIndex = 1; targetIndex <= target.length; targetIndex += 1) {
      const substitutionCost =
        source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1;
      const distance = Math.min(
        (previousRow[targetIndex] as number) + 1,
        (currentRow[targetIndex - 1] as number) + 1,
        (previousRow[targetIndex - 1] as number) + substitutionCost
      );

      currentRow[targetIndex] = distance;
      rowMinimum = Math.min(rowMinimum, distance);
    }

    if (rowMinimum > maxDistance) return maxDistance + 1;
    previousRow = currentRow;
  }

  return previousRow[target.length] as number;
};

const getTypoFuzzyDistance = <Item>({
  entry,
  normalizedSearch,
}: {
  entry: ComboboxSearchEntry<Item>;
  normalizedSearch: string;
}) => {
  const maxDistance = getTypoFuzzyMaxDistance(normalizedSearch.length);
  if (maxDistance === 0) return null;

  let bestDistance = maxDistance + 1;
  const candidates = [
    entry.normalizedCompactLabel,
    ...entry.normalizedWords.flatMap(word =>
      word.length > normalizedSearch.length
        ? [word, word.slice(0, normalizedSearch.length)]
        : [word]
    ),
  ];

  for (const candidate of candidates) {
    const distance = getBoundedEditDistance(
      normalizedSearch,
      candidate,
      maxDistance
    );

    bestDistance = Math.min(bestDistance, distance);
    if (bestDistance === 0) break;
  }

  return bestDistance <= maxDistance ? bestDistance : null;
};

const getComboboxSearchMatch = <Item>({
  entry,
  includeTypoFuzzy = false,
  normalizedSearch,
  normalizedSearchWords,
}: {
  entry: ComboboxSearchEntry<Item>;
  includeTypoFuzzy?: boolean;
  normalizedSearch: string;
  normalizedSearchWords: string[];
}): ComboboxSearchMatch | null => {
  const baseMatch = {
    distance: 0,
    lengthDelta: Math.max(
      0,
      entry.normalizedLabel.length - normalizedSearch.length
    ),
    originalIndex: entry.originalIndex,
  };

  if (entry.normalizedLabel === normalizedSearch) {
    return {
      ...baseMatch,
      position: 0,
      tier: comboboxSearchTier.exact,
    };
  }

  if (entry.normalizedLabel.startsWith(normalizedSearch)) {
    return {
      ...baseMatch,
      position: 0,
      tier: comboboxSearchTier.prefix,
    };
  }

  const wordPrefixPosition = getWordPrefixPosition(
    entry.normalizedWords,
    normalizedSearchWords
  );
  if (wordPrefixPosition !== null) {
    return {
      ...baseMatch,
      position: wordPrefixPosition,
      tier: comboboxSearchTier.wordPrefix,
    };
  }

  const substringPosition = entry.normalizedLabel.indexOf(normalizedSearch);
  if (substringPosition >= 0) {
    return {
      ...baseMatch,
      position: substringPosition,
      tier: comboboxSearchTier.substring,
    };
  }

  const normalizedCompactSearch = normalizedSearchWords.join('');
  if (
    normalizedCompactSearch.length >= 2 &&
    entry.normalizedAcronym.startsWith(normalizedCompactSearch)
  ) {
    return {
      ...baseMatch,
      lengthDelta: Math.max(
        0,
        entry.normalizedAcronym.length - normalizedCompactSearch.length
      ),
      position: 0,
      tier: comboboxSearchTier.acronym,
    };
  }

  const normalizedSearchSkeleton =
    getComboboxConsonantSkeleton(normalizedSearch);
  if (
    normalizedSearchSkeleton.length >= 2 &&
    entry.normalizedConsonantSkeleton.includes(normalizedSearchSkeleton)
  ) {
    return {
      ...baseMatch,
      lengthDelta: Math.max(
        0,
        entry.normalizedConsonantSkeleton.length -
          normalizedSearchSkeleton.length
      ),
      position: entry.normalizedConsonantSkeleton.indexOf(
        normalizedSearchSkeleton
      ),
      tier: comboboxSearchTier.consonantSkeleton,
    };
  }

  const subsequencePosition = getSubsequencePosition(
    entry.normalizedCompactLabel,
    normalizedCompactSearch
  );
  if (subsequencePosition !== null) {
    return {
      ...baseMatch,
      lengthDelta: Math.max(
        0,
        entry.normalizedCompactLabel.length - normalizedCompactSearch.length
      ),
      position: subsequencePosition,
      tier: comboboxSearchTier.subsequence,
    };
  }

  if (includeTypoFuzzy) {
    const typoDistance = getTypoFuzzyDistance({
      entry,
      normalizedSearch,
    });
    if (typoDistance !== null) {
      return {
        ...baseMatch,
        distance: typoDistance,
        tier: comboboxSearchTier.typoFuzzy,
        position: 0,
      };
    }
  }

  return null;
};

const compareComboboxSearchMatches = (
  first: ComboboxSearchMatch,
  second: ComboboxSearchMatch
) =>
  first.tier - second.tier ||
  first.distance - second.distance ||
  first.position - second.position ||
  first.lengthDelta - second.lengthDelta ||
  first.originalIndex - second.originalIndex;

const hasComboboxSearchMatch = <Item>(result: {
  entry: ComboboxSearchEntry<Item>;
  match: ComboboxSearchMatch | null;
}): result is ComboboxMatchedSearchEntry<Item> => result.match !== null;

const insertLimitedMatchedEntry = <Item>(
  matchedEntries: ComboboxMatchedSearchEntry<Item>[],
  nextEntry: ComboboxMatchedSearchEntry<Item>,
  limit: number
) => {
  matchedEntries.push(nextEntry);
  matchedEntries.sort((first, second) =>
    compareComboboxSearchMatches(first.match, second.match)
  );

  if (matchedEntries.length > limit) {
    matchedEntries.pop();
  }
};

const getLimitedMatchedComboboxSearchState = <Item>({
  includeTypoFuzzy = false,
  isSameItem,
  limit,
  normalizedSearch,
  normalizedSearchWords,
  searchEntries,
  selectedValue,
}: {
  includeTypoFuzzy?: boolean;
  isSameItem: (item: Item, value: Item) => boolean;
  limit: number;
  normalizedSearch: string;
  normalizedSearchWords: string[];
  searchEntries: readonly ComboboxSearchEntry<Item>[];
  selectedValue: Item | null;
}) => {
  const matchedEntries: ComboboxMatchedSearchEntry<Item>[] = [];
  let hasExactItem = false;
  let hasMatch = false;
  let selectedMatchedItem: Item | null = null;

  for (const entry of searchEntries) {
    const match = getComboboxSearchMatch({
      entry,
      includeTypoFuzzy,
      normalizedSearch,
      normalizedSearchWords,
    });
    if (match === null) continue;

    hasMatch = true;
    if (match.tier === comboboxSearchTier.exact) {
      hasExactItem = true;
    }
    if (
      selectedValue !== null &&
      selectedMatchedItem === null &&
      isSameItem(entry.item, selectedValue)
    ) {
      selectedMatchedItem = entry.item;
    }

    insertLimitedMatchedEntry(matchedEntries, { entry, match }, limit);
  }

  const visibleItems = matchedEntries.map(({ entry }) => entry.item);
  if (selectedMatchedItem !== null) {
    const selectedItem = selectedMatchedItem;
    const hasVisibleSelectedItem = visibleItems.some(visibleItem =>
      isSameItem(visibleItem, selectedItem)
    );
    if (hasVisibleSelectedItem) {
      return {
        hasExactItem,
        hasMatch,
        visibleItems,
      };
    }

    if (limit === 1) {
      visibleItems[0] = selectedItem;
    } else {
      visibleItems[limit - 1] = selectedItem;
    }
  }

  return {
    hasExactItem,
    hasMatch,
    visibleItems,
  };
};

export const getComboboxSearchState = <Item>({
  isSameItem,
  items,
  normalizedInputValue,
  searchEntries,
  selectedValue,
  visibleItemLimit,
}: {
  isSameItem: (item: Item, value: Item) => boolean;
  items: readonly Item[];
  normalizedInputValue: string;
  searchEntries: readonly ComboboxSearchEntry<Item>[];
  selectedValue: Item | null;
  visibleItemLimit?: number;
}): ComboboxSearchState<Item> => {
  const limit = getEffectiveComboboxVisibleItemLimit({
    itemCount: items.length,
    visibleItemLimit,
  });

  if (!normalizedInputValue) {
    return {
      hasExactItem: false,
      visibleItems: getLimitedComboboxItems({
        isSameItem,
        items,
        limit,
        selectedValue,
      }),
    };
  }

  const normalizedSearch = normalizeComboboxSearchText(normalizedInputValue);
  const normalizedSearchWords = splitComboboxSearchWords(normalizedSearch);

  if (limit !== undefined) {
    const deterministicState = getLimitedMatchedComboboxSearchState({
      isSameItem,
      limit,
      normalizedSearch,
      normalizedSearchWords,
      searchEntries,
      selectedValue,
    });
    const searchState = deterministicState.hasMatch
      ? deterministicState
      : getLimitedMatchedComboboxSearchState({
          includeTypoFuzzy: true,
          isSameItem,
          limit,
          normalizedSearch,
          normalizedSearchWords,
          searchEntries,
          selectedValue,
        });

    return {
      hasExactItem: searchState.hasExactItem,
      visibleItems: searchState.visibleItems,
    };
  }

  const getMatchedEntries = (includeTypoFuzzy = false) =>
    searchEntries.map(entry => ({
      entry,
      match: getComboboxSearchMatch({
        entry,
        includeTypoFuzzy,
        normalizedSearch,
        normalizedSearchWords,
      }),
    }));
  const deterministicEntries = getMatchedEntries().filter(
    hasComboboxSearchMatch
  );
  const matchedEntries = (
    deterministicEntries.length > 0
      ? deterministicEntries
      : getMatchedEntries(true).filter(hasComboboxSearchMatch)
  ).sort((first, second) =>
    compareComboboxSearchMatches(first.match, second.match)
  );
  const hasExactItem = matchedEntries.some(
    ({ match }) => match.tier === comboboxSearchTier.exact
  );

  return {
    hasExactItem,
    visibleItems: matchedEntries.map(({ entry }) => entry.item),
  };
};
