export type SupabaseRelationValue<T> = T | T[] | null | undefined;

export const getSingleSupabaseRelation = <T>(
  value: SupabaseRelationValue<T>
): T | null => {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
};

export const getSupabaseRelationName = <T extends { name?: string | null }>(
  value: SupabaseRelationValue<T>,
  fallback: string
) => getSingleSupabaseRelation(value)?.name || fallback;
