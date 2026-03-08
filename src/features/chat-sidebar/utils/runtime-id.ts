const FALLBACK_RANDOM_SEGMENT_LENGTH = 10;

const buildFallbackRandomSegment = () =>
  Math.random()
    .toString(36)
    .slice(2, 2 + FALLBACK_RANDOM_SEGMENT_LENGTH)
    .padEnd(FALLBACK_RANDOM_SEGMENT_LENGTH, '0');

export const createRuntimeId = (prefix?: string) => {
  const rawId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${buildFallbackRandomSegment()}`;

  return prefix ? `${prefix}_${rawId}` : rawId;
};

export const createStableKey = (parts: Array<string | null | undefined>) => {
  const normalizedParts = parts
    .map(part => part?.trim())
    .filter((part): part is string => Boolean(part));

  return [...normalizedParts, createRuntimeId('stable')].join('-');
};
