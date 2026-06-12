export type SearchMatcher<T> = (
  item: T,
  normalizedSearchTerm: string
) => boolean;
export type SearchScorer<T> = (item: T, normalizedSearchTerm: string) => number;
export type SearchTieBreaker<T> = (a: T, b: T) => number;

interface FilterAndRankOptions<T> {
  data: T[];
  searchTerm: string;
  matcher: SearchMatcher<T>;
  scorer: SearchScorer<T>;
  tieBreaker?: SearchTieBreaker<T>;
}

export const normalizeSearchTerm = (searchTerm: string): string =>
  searchTerm.toLowerCase();

export const filterAndRank = <T>({
  data,
  searchTerm,
  matcher,
  scorer,
  tieBreaker,
}: FilterAndRankOptions<T>): T[] => {
  const normalizedSearchTerm = normalizeSearchTerm(searchTerm);

  return data
    .filter(item => matcher(item, normalizedSearchTerm))
    .sort((a, b) => {
      const scoreA = scorer(a, normalizedSearchTerm);
      const scoreB = scorer(b, normalizedSearchTerm);

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      return tieBreaker ? tieBreaker(a, b) : 0;
    });
};
