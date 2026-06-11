import { getComboboxConsonantSkeleton } from './text';
import type {
  ComboboxMatchedSearchEntry,
  ComboboxSearchEntry,
  ComboboxSearchMatch,
} from './types';

export const comboboxSearchTier = {
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

export const getComboboxSearchMatch = <Item>({
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

export const compareComboboxSearchMatches = (
  first: ComboboxSearchMatch,
  second: ComboboxSearchMatch
) =>
  first.tier - second.tier ||
  first.distance - second.distance ||
  first.position - second.position ||
  first.lengthDelta - second.lengthDelta ||
  first.originalIndex - second.originalIndex;

export const hasComboboxSearchMatch = <Item>(result: {
  entry: ComboboxSearchEntry<Item>;
  match: ComboboxSearchMatch | null;
}): result is ComboboxMatchedSearchEntry<Item> => result.match !== null;
