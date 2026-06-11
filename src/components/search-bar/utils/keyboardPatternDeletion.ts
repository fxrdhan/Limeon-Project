import { removeGroupTokenAtIndex } from './groupPatternUtils';

const stripTrailingConfirmation = (input: string): string => {
  const trimmed = input.trimEnd();
  return trimmed.endsWith('##') ? trimmed.slice(0, -2).trimEnd() : trimmed;
};

export const ensureTrailingHash = (input: string): string => {
  const trimmed = input.trimEnd();
  if (!trimmed) return '#';
  return trimmed.endsWith('#') ? trimmed : `${trimmed} #`;
};

const collapsePatternWhitespace = (input: string): string => {
  return input.replace(/\s{2,}/g, ' ').trimStart();
};

export const deleteLastBadgeUnit = (input: string): string => {
  const hasConfirmation = input.trimEnd().endsWith('##');
  const base = stripTrailingConfirmation(input);
  let working = base.trimEnd();
  if (!working) return '';

  if (working.endsWith('#')) {
    working = working.replace(/\s*#\s*$/, '').trimEnd();
    if (!working) return '';
  }

  const finalize = (next: string): string => {
    let result = collapsePatternWhitespace(next);
    const trimmedEnd = result.trimEnd();
    if (!trimmedEnd) return '';

    if (/#(?:and|or)$/i.test(trimmedEnd)) {
      result = `${trimmedEnd} `;
    } else {
      result = trimmedEnd;
    }

    const resultTrimmed = result.trimEnd();

    if (hasConfirmation && resultTrimmed) {
      if (resultTrimmed.endsWith('#)')) {
        return `${resultTrimmed}##`;
      }

      const endsWithHashToken = /(?:^|\s)#[^\s#]+$/.test(resultTrimmed);
      if (!endsWithHashToken) {
        return `${resultTrimmed}##`;
      }
    }

    return result;
  };

  if (working.endsWith('#)')) {
    return finalize(working.replace(/\s*#\)\s*$/, ''));
  }
  if (working.endsWith('#(')) {
    return finalize(working.replace(/\s*#\(\s*$/, ''));
  }

  const trailingTokenMatch = working.match(/(?:^|\s)#[^\s#]+$/);
  if (trailingTokenMatch) {
    return finalize(working.replace(/(?:^|\s)#[^\s#]+$/, ''));
  }

  const tokenRegex = /#\(|#\)|#[^\s#]+/g;
  let lastToken: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(working)) !== null) {
    lastToken = match;
  }
  if (!lastToken) {
    return '';
  }

  const cutIndex = lastToken.index + lastToken[0].length;
  const prefix = working.slice(0, cutIndex).trimEnd();
  return finalize(prefix);
};

export const deleteGroupedPartialTail = (input: string): string | null => {
  const hasGroupTokens = input.includes('#(') || input.includes('#)');
  if (!hasGroupTokens) return null;

  const base = stripTrailingConfirmation(input);
  const normalized = base.replace(/\s+/g, ' ').trimEnd();
  if (!normalized) return null;

  if (normalized.endsWith('#')) {
    const withoutMarker = base.replace(/\s*#\s*$/, '').trimEnd();
    if (withoutMarker !== base) {
      return deleteGroupedPartialTail(withoutMarker) ?? withoutMarker;
    }
  }

  if (normalized.endsWith('#(') || normalized.endsWith('#)')) {
    const tokenType = normalized.endsWith('#(') ? 'groupOpen' : 'groupClose';
    const tokenCount = (
      input.match(tokenType === 'groupOpen' ? /#\(/g : /#\)/g) || []
    ).length;
    if (tokenCount > 0) {
      return removeGroupTokenAtIndex(input, tokenType, tokenCount - 1);
    }
  }

  const joinTailMatch = normalized.match(/^(.*)\s+#(?:and|or)\s*(?:#\s*)?$/i);
  if (joinTailMatch) {
    const withoutJoin = joinTailMatch[1]?.trimEnd() ?? '';
    return withoutJoin;
  }

  const trailingValueMatch = normalized.match(
    /^(.*#(?![()])[^\s#]+)\s+([^#]+)$/
  );
  if (trailingValueMatch) {
    return `${trailingValueMatch[1]} `;
  }

  const trailingTokenMatch = normalized.match(/^(.*)\s+#(?![()])[^\s#]+\s*$/);
  if (trailingTokenMatch) {
    const prefix = trailingTokenMatch[1]?.trimEnd() ?? '';
    return ensureTrailingHash(prefix);
  }

  return null;
};
