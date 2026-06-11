import { getLimitedComboboxItems } from './limits';
import {
  comboboxSearchTier,
  compareComboboxSearchMatches,
  getComboboxSearchMatch,
  hasComboboxSearchMatch,
} from './matching';
import { normalizeComboboxSearchText, splitComboboxSearchWords } from './text';
import type {
  ComboboxMatchedSearchEntry,
  ComboboxSearchEntry,
  ComboboxSearchState,
} from './types';

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
  getEffectiveVisibleItemLimit,
  isSameItem,
  items,
  normalizedInputValue,
  searchEntries,
  selectedValue,
  visibleItemLimit,
}: {
  getEffectiveVisibleItemLimit: (options: {
    itemCount: number;
    visibleItemLimit?: number;
  }) => number | undefined;
  isSameItem: (item: Item, value: Item) => boolean;
  items: readonly Item[];
  normalizedInputValue: string;
  searchEntries: readonly ComboboxSearchEntry<Item>[];
  selectedValue: Item | null;
  visibleItemLimit?: number;
}): ComboboxSearchState<Item> => {
  const limit = getEffectiveVisibleItemLimit({
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
