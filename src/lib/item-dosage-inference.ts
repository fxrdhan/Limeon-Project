import type { DropdownOption } from '@/types/components';

const ITEM_NAME_TOKEN_ALIASES: Record<string, string> = {
  injeksi: 'INJECTION',
  kapsul: 'CAPSULE',
  krim: 'CREAM',
  larutan: 'SOLUTION',
  salep: 'OINTMENT',
  sirup: 'SYRUP',
  suspensi: 'SUSPENSION',
  tetes: 'DROPS',
};

const normalizeToken = (token: string) =>
  ITEM_NAME_TOKEN_ALIASES[token.toLowerCase()] || token.toUpperCase();

type TokenMatch = {
  end: number;
  normalized: string;
  raw: string;
  start: number;
};

const tokenize = (value: string) =>
  value
    .replace(/[^a-zA-Z0-9%]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeToken);

const getTokenMatches = (value: string): TokenMatch[] =>
  Array.from(value.matchAll(/[a-zA-Z0-9%]+/g)).map(match => ({
    raw: match[0] || '',
    normalized: normalizeToken(match[0] || ''),
    start: match.index ?? 0,
    end: (match.index ?? 0) + (match[0]?.length || 0),
  }));

const sanitizeDisplayName = (value: string) =>
  value
    .replace(/\s+/g, ' ')
    .replace(/\s+([,./-])/g, '$1')
    .replace(/([(/-])\s+/g, '$1')
    .trim();

type DosageCandidate = {
  dosage: DropdownOption;
  matchedIndexes: number[];
};

const findDosageCandidate = (
  displayName: string,
  dosages: DropdownOption[]
): DosageCandidate | null => {
  const inputTokenMatches = getTokenMatches(displayName);
  if (inputTokenMatches.length === 0) return null;

  const candidates = dosages
    .map(dosage => {
      const dosageTokens = tokenize(dosage.name);
      const usedIndexes = new Set<number>();
      const matchedIndexes: number[] = [];

      for (const dosageToken of dosageTokens) {
        const matchedIndex = inputTokenMatches.findIndex(
          (token, index) =>
            token.normalized === dosageToken && !usedIndexes.has(index)
        );

        if (matchedIndex === -1) {
          return null;
        }

        usedIndexes.add(matchedIndex);
        matchedIndexes.push(matchedIndex);
      }

      return {
        dosage,
        dosageTokenCount: dosageTokens.length,
        matchedIndexes,
      };
    })
    .filter(candidate => candidate !== null)
    .sort((left, right) => {
      if (right.dosageTokenCount !== left.dosageTokenCount) {
        return right.dosageTokenCount - left.dosageTokenCount;
      }

      return right.dosage.name.length - left.dosage.name.length;
    });

  if (candidates.length === 0) return null;

  return {
    dosage: candidates[0].dosage,
    matchedIndexes: candidates[0].matchedIndexes,
  };
};

export const inferDosageFromDisplayName = (
  displayName: string,
  dosages: DropdownOption[]
) => findDosageCandidate(displayName, dosages)?.dosage || null;

export const extractDosageFromDisplayName = (
  displayName: string,
  dosages: DropdownOption[]
) => {
  const candidate = findDosageCandidate(displayName, dosages);

  if (!candidate) {
    return {
      cleanedDisplayName: sanitizeDisplayName(displayName),
      dosage: null,
    };
  }

  const tokenMatches = getTokenMatches(displayName);
  const removedIndexes = new Set(candidate.matchedIndexes);
  const cleanedDisplayName = sanitizeDisplayName(
    tokenMatches.reduceRight((currentValue, token, index) => {
      if (!removedIndexes.has(index)) return currentValue;
      return `${currentValue.slice(0, token.start)} ${currentValue.slice(token.end)}`;
    }, displayName)
  );

  return {
    cleanedDisplayName,
    dosage: candidate.dosage,
  };
};
