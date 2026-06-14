const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value?: string | null): value is string =>
  typeof value === 'string' && UUID_PATTERN.test(value.trim());

export const normalizeUuidList = (
  values: Array<string | null | undefined>
): string[] => {
  const normalizedValues = values
    .map(value => value?.trim())
    .filter((value): value is string => Boolean(value) && isUuid(value));

  return [...new Set(normalizedValues)];
};
