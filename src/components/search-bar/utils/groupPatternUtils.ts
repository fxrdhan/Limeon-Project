const GROUP_OPEN = '#(';
const GROUP_CLOSE = '#)';

export const countGroupDepth = (value: string): number => {
  const openCount = (value.match(/#\(/g) || []).length;
  const closeCount = (value.match(/#\)/g) || []).length;
  return openCount - closeCount;
};

export const stripConfirmationMarker = (value: string): string => {
  const trimmed = value.trimEnd();
  if (trimmed.endsWith('##')) {
    return trimmed.slice(0, -2).trimEnd();
  }
  return trimmed;
};

export const replaceTrailingHash = (
  value: string,
  replacement: string
): string => {
  const cleaned = stripConfirmationMarker(value);
  const trimmed = cleaned.replace(/\s+$/, '');
  const base = trimmed.endsWith('#') ? trimmed.slice(0, -1).trimEnd() : trimmed;
  const separator = base ? ' ' : '';
  return `${base}${separator}${replacement}`;
};

export const insertGroupOpenToken = (value: string): string => {
  const updated = replaceTrailingHash(value, GROUP_OPEN);
  return updated.endsWith(' ') ? updated : `${updated} `;
};

export const insertGroupCloseToken = (value: string): string | null => {
  if (countGroupDepth(value) <= 0) {
    return null;
  }
  const trimmed = value.trimEnd();
  const hasConfirmation = trimmed.endsWith('##');
  const withoutConfirmation = hasConfirmation
    ? trimmed.slice(0, -2).trimEnd()
    : trimmed;
  const base = withoutConfirmation.endsWith('#')
    ? withoutConfirmation.slice(0, -1).trimEnd()
    : withoutConfirmation;
  const separator = base ? ' ' : '';
  const nextValue = `${base}${separator}${GROUP_CLOSE}`;
  return hasConfirmation ? `${nextValue}##` : nextValue;
};

export const normalizeGroupSearchTerm = (term: string): string => {
  if (term === '(' || term === ')') return '';
  return term;
};

type GroupPatternTokenType =
  | 'groupOpen'
  | 'groupClose'
  | 'confirm'
  | 'marker'
  | 'other';

export type GroupPatternToken = {
  type: GroupPatternTokenType;
};

const GROUP_TOKEN_REGEX = /##|#\(|#\)|#[^\s]+|#/g;

export const tokenizeGroupPattern = (value: string): GroupPatternToken[] => {
  GROUP_TOKEN_REGEX.lastIndex = 0;
  const tokens: GroupPatternToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = GROUP_TOKEN_REGEX.exec(value)) !== null) {
    if (match.index > lastIndex) {
      const rawValue = value.slice(lastIndex, match.index).trim();
      if (rawValue) {
        tokens.push({ type: 'other' });
      }
    }

    const token = match[0];
    if (token === '##') {
      tokens.push({ type: 'confirm' });
    } else if (token === '#(') {
      tokens.push({ type: 'groupOpen' });
    } else if (token === '#)') {
      tokens.push({ type: 'groupClose' });
    } else if (token === '#') {
      tokens.push({ type: 'marker' });
    } else {
      tokens.push({ type: 'other' });
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < value.length) {
    const rawValue = value.slice(lastIndex).trim();
    if (rawValue) {
      tokens.push({ type: 'other' });
    }
  }

  return tokens;
};

export const removeGroupTokenAtIndex = (
  value: string,
  tokenType: 'groupOpen' | 'groupClose',
  occurrenceIndex: number
): string => {
  const regex = tokenType === 'groupOpen' ? /#\(/g : /#\)/g;
  let match: RegExpExecArray | null;
  let currentIndex = 0;

  while ((match = regex.exec(value)) !== null) {
    if (currentIndex === occurrenceIndex) {
      const before = value.slice(0, match.index);
      const after = value.slice(match.index + match[0].length);
      return `${before}${after}`.replace(/\s{2,}/g, ' ').trimStart();
    }
    currentIndex += 1;
  }

  return value;
};
