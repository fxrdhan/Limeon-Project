import React from 'react';
import { getDropdownOptionMatchRanges } from '@/components/dropdown/utils/dropdownUtils';

export const renderHighlightedText = (text: string, searchTerm: string) => {
  const ranges = getDropdownOptionMatchRanges(text, searchTerm);
  if (ranges.length === 0) return text;

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  ranges.forEach((range, index) => {
    if (range.start > cursor) {
      parts.push(text.slice(cursor, range.start));
    }

    parts.push(
      <span key={`${range.start}-${range.end}-${index}`} className="font-bold">
        {text.slice(range.start, range.end)}
      </span>
    );
    cursor = range.end;
  });

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts;
};
