import type { Supplier as SupplierType } from '@/types';

export type SupplierModalData = Record<
  string,
  string | number | boolean | null
>;
export type SupplierIdentityModalData = Record<string, unknown>;

const supplierInlineTextFields = new Set([
  'address',
  'contact_person',
  'email',
  'name',
  'phone',
]);

const toNormalizedInlineText = (input: unknown): string => {
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

const toLegacyModalString = (value: unknown) => {
  if (!value) return '';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toString();
  }
  return '';
};
const toLegacyNullableModalString = (value: unknown) =>
  toLegacyModalString(value) || null;

export const normalizeSupplierInlineFieldValue = (
  key: string,
  value: unknown
) => {
  if (!supplierInlineTextFields.has(key)) return value;

  const normalizedValue = toNormalizedInlineText(value);
  return normalizedValue === '' ? null : normalizedValue;
};

export const buildSupplierModalData = (
  supplier: SupplierType | null
): SupplierModalData => {
  const modalData: SupplierModalData = {};

  if (!supplier) return modalData;

  Object.entries(supplier).forEach(([key, value]) => {
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      modalData[key] = value;
    }
  });

  return modalData;
};

export const buildSupplierCreatePayload = (
  data: SupplierIdentityModalData
): Omit<SupplierType, 'id' | 'updated_at'> => ({
  name: toLegacyModalString(data.name),
  address: toLegacyNullableModalString(data.address),
  phone: toLegacyNullableModalString(data.phone),
  email: toLegacyNullableModalString(data.email),
  contact_person: toLegacyNullableModalString(data.contact_person),
  image_url: toLegacyNullableModalString(data.image_url),
});

export const buildSupplierUpdatePayload = (
  data: SupplierIdentityModalData
): Pick<
  SupplierType,
  'address' | 'contact_person' | 'email' | 'name' | 'phone'
> => ({
  name: toLegacyModalString(data.name),
  address: toLegacyNullableModalString(data.address),
  phone: toLegacyNullableModalString(data.phone),
  email: toLegacyNullableModalString(data.email),
  contact_person: toLegacyNullableModalString(data.contact_person),
});
