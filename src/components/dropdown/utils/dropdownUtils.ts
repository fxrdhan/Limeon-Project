import { fuzzyMatch } from '@/utils/search';

export const getDropdownOptionScore = (
  option: { name: string; id: string },
  searchTermLower: string
): number => {
  const nameLower = option.name?.toLowerCase?.() ?? '';
  if (nameLower.includes(searchTermLower)) return 3;
  if (fuzzyMatch(option.name, searchTermLower)) return 1;
  return 0;
};

export const filterAndSortOptions = (
  options: Array<{ id: string; name: string }>,
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
      const scoreA = getDropdownOptionScore(a, searchTermLower);
      const scoreB = getDropdownOptionScore(b, searchTermLower);
      return scoreB !== scoreA ? scoreB - scoreA : a.name.localeCompare(b.name);
    });
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
