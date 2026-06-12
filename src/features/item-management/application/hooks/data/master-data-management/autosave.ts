const REQUIRED_FIELDS_BY_TABLE: Record<string, Set<string>> = {
  suppliers: new Set(['name']),
  patients: new Set(['name']),
  doctors: new Set(['name']),
  customers: new Set(['name', 'customer_level_id']),
};

const NULLABLE_FIELDS_BY_TABLE: Record<string, Set<string>> = {
  suppliers: new Set([
    'address',
    'phone',
    'email',
    'contact_person',
    'image_url',
  ]),
  patients: new Set(['gender', 'birth_date', 'address', 'phone', 'email']),
  doctors: new Set([
    'gender',
    'specialization',
    'license_number',
    'experience_years',
    'qualification',
    'phone',
    'email',
    'address',
    'birth_date',
    'image_url',
  ]),
  customers: new Set(['phone', 'email', 'address']),
};

const toNormalizedText = (input: unknown): string => {
  if (input === null || input === undefined) return '';
  if (
    typeof input === 'string' ||
    typeof input === 'number' ||
    typeof input === 'boolean' ||
    typeof input === 'bigint'
  ) {
    return String(input).trim();
  }
  if (input instanceof Date) {
    return input.toISOString().trim();
  }
  return '';
};

export const normalizeMasterDataAutosaveField = (
  tableName: string,
  fieldKey: string,
  value: unknown
): { key: string; value: unknown } | null => {
  const mappedKey =
    tableName === 'doctors' && fieldKey === 'education'
      ? 'qualification'
      : fieldKey;

  if (mappedKey === 'experience_years') {
    const normalizedValue = toNormalizedText(value);
    if (normalizedValue === '') {
      return { key: mappedKey, value: null };
    }
    const parsed = Number(normalizedValue);
    return Number.isFinite(parsed) ? { key: mappedKey, value: parsed } : null;
  }

  const requiredFields =
    REQUIRED_FIELDS_BY_TABLE[tableName] ?? new Set(['name']);
  if (requiredFields.has(mappedKey)) {
    const normalizedValue = toNormalizedText(value);
    if (normalizedValue === '') {
      return null;
    }
    return { key: mappedKey, value: normalizedValue };
  }

  const nullableFields =
    NULLABLE_FIELDS_BY_TABLE[tableName] ?? new Set<string>();
  if (nullableFields.has(mappedKey)) {
    const normalizedValue = toNormalizedText(value);
    if (normalizedValue === '') {
      return { key: mappedKey, value: null };
    }
    return { key: mappedKey, value: normalizedValue };
  }

  return { key: mappedKey, value };
};
