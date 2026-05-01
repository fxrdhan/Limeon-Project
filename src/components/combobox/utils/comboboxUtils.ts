import { fuzzyMatch } from '@/utils/search';

export interface ComboboxOptionMatchRange {
  start: number;
  end: number;
}

const tokenizeOptionName = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9%]+/)
    .filter(Boolean);

export const getComboboxOptionScore = (
  option: { name: string; id: string },
  searchTermLower: string
): number => {
  const nameLower = option.name?.toLowerCase?.() ?? '';
  const nameTokens = tokenizeOptionName(option.name || '');

  if (nameLower === searchTermLower) return 7;
  if (nameLower.startsWith(searchTermLower)) return 6;
  if (nameTokens.some(token => token === searchTermLower)) return 5;
  if (nameTokens.some(token => token.startsWith(searchTermLower))) return 4;
  if (nameTokens.some(token => token.includes(searchTermLower))) return 3;
  if (nameLower.includes(searchTermLower)) return 2;
  if (fuzzyMatch(option.name, searchTermLower)) return 1;
  return 0;
};

export const filterAndSortOptions = <T extends { id: string; name: string }>(
  options: T[],
  searchTerm: string
) => {
  const searchTermLower = searchTerm.toLowerCase();
  return options
    .filter(
      option =>
        option.name.toLowerCase().includes(searchTermLower) ||
        fuzzyMatch(option.name, searchTermLower)
    )
    .sort((a, b) => {
      const scoreA = getComboboxOptionScore(a, searchTermLower);
      const scoreB = getComboboxOptionScore(b, searchTermLower);
      if (scoreB !== scoreA) return scoreB - scoreA;
      if (a.name.length !== b.name.length) return a.name.length - b.name.length;
      return a.name.localeCompare(b.name);
    });
};

export const getComboboxOptionMatchRanges = (
  text: string,
  searchTerm: string
): ComboboxOptionMatchRange[] => {
  const searchTermLower = searchTerm.trim().toLowerCase();
  if (!text || !searchTermLower) return [];

  const textLower = text.toLowerCase();
  const matchedIndexes: number[] = [];
  let textIndex = 0;

  for (const searchCharacter of searchTermLower) {
    const matchedIndex = textLower.indexOf(searchCharacter, textIndex);
    if (matchedIndex === -1) return [];

    matchedIndexes.push(matchedIndex);
    textIndex = matchedIndex + 1;
  }

  return matchedIndexes.reduce<ComboboxOptionMatchRange[]>(
    (ranges, matchedIndex) => {
      const previousRange = ranges[ranges.length - 1];

      if (previousRange && previousRange.end === matchedIndex) {
        previousRange.end = matchedIndex + 1;
        return ranges;
      }

      ranges.push({ start: matchedIndex, end: matchedIndex + 1 });
      return ranges;
    },
    []
  );
};

export const getSearchIconColor = (searchState: string) => {
  const colors: Record<string, string> = {
    idle: 'text-slate-400',
    typing: 'text-slate-800',
    found: 'text-primary',
    'not-found': 'text-primary',
  };
  return colors[searchState] || 'text-slate-400';
};
