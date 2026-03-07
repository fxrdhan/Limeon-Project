import type { ReactNode } from 'react';

const SEARCH_HIGHLIGHT_CLASS =
  'rounded-[4px] bg-amber-200 px-0.5 text-slate-900';

const getSearchMatchIndex = (text: string, normalizedSearchQuery: string) => {
  if (!normalizedSearchQuery) return -1;

  return text.toLowerCase().indexOf(normalizedSearchQuery);
};

export const buildCollapsedSearchSnippet = (
  text: string,
  normalizedSearchQuery: string,
  maxMessageChars: number
) => {
  if (text.length <= maxMessageChars) {
    return { text, hasLeadingEllipsis: false, hasTrailingEllipsis: false };
  }

  const matchIndex = getSearchMatchIndex(text, normalizedSearchQuery);
  if (matchIndex === -1 || matchIndex < maxMessageChars) {
    return {
      text: text.slice(0, maxMessageChars).trimEnd(),
      hasLeadingEllipsis: false,
      hasTrailingEllipsis: true,
    };
  }

  const desiredStart = Math.max(
    0,
    matchIndex -
      Math.floor((maxMessageChars - normalizedSearchQuery.length) / 2)
  );
  const maxStart = Math.max(0, text.length - maxMessageChars);
  const startIndex = Math.min(desiredStart, maxStart);
  const endIndex = Math.min(text.length, startIndex + maxMessageChars);

  return {
    text: text.slice(startIndex, endIndex).trim(),
    hasLeadingEllipsis: startIndex > 0,
    hasTrailingEllipsis: endIndex < text.length,
  };
};

export const renderHighlightedText = (
  text: string,
  normalizedSearchQuery: string
): ReactNode => {
  if (!normalizedSearchQuery) return text;

  const lowerText = text.toLowerCase();
  const matchIndex = lowerText.indexOf(normalizedSearchQuery);
  if (matchIndex === -1) return text;

  const beforeMatch = text.slice(0, matchIndex);
  const matchText = text.slice(
    matchIndex,
    matchIndex + normalizedSearchQuery.length
  );
  const afterMatch = text.slice(matchIndex + normalizedSearchQuery.length);

  return (
    <>
      {beforeMatch}
      <mark className={SEARCH_HIGHLIGHT_CLASS}>{matchText}</mark>
      {renderHighlightedText(afterMatch, normalizedSearchQuery)}
    </>
  );
};
