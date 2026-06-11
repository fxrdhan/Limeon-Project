export type ItemLabelGetter<Item> = (item: Item) => string;

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

export type ComboboxSearchMatch = {
  distance: number;
  lengthDelta: number;
  originalIndex: number;
  position: number;
  tier: number;
};

export type ComboboxMatchedSearchEntry<Item> = {
  entry: ComboboxSearchEntry<Item>;
  match: ComboboxSearchMatch;
};
