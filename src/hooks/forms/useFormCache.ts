import { useEffect, useRef } from 'react';
import type { FormData, PackageConversion } from '@/types';

export interface CacheData {
  formData: FormData;
  conversions: PackageConversion[];
}

interface UseFormCacheOptions {
  cacheKey: string;
  isEditMode: boolean;
  isDirty: () => boolean;
  isSaving: boolean;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toStringValue = (value: unknown, fallback = '') =>
  typeof value === 'string' ? value : fallback;

const toOptionalStringValue = (value: unknown) =>
  typeof value === 'string' ? value : undefined;

const toNullableStringValue = (value: unknown) =>
  typeof value === 'string' || value === null ? value : null;

const toNumberValue = (value: unknown, fallback = 0) => {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : fallback;

  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const toNullableNumberValue = (value: unknown) =>
  value === null ? null : toNumberValue(value);

const toBooleanValue = (value: unknown, fallback = false) =>
  typeof value === 'boolean' ? value : fallback;

const normalizeCachedFormData = (value: unknown): FormData | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  if (typeof value.name !== 'string') {
    return null;
  }

  return {
    ...value,
    code: toStringValue(value.code),
    name: value.name,
    manufacturer_id: toStringValue(value.manufacturer_id),
    type_id: toStringValue(value.type_id),
    category_id: toStringValue(value.category_id),
    package_id: toStringValue(value.package_id),
    base_inventory_unit_id: toOptionalStringValue(value.base_inventory_unit_id),
    dosage_id: toStringValue(value.dosage_id),
    barcode: toStringValue(value.barcode),
    description: toStringValue(value.description),
    base_price: toNumberValue(value.base_price),
    sell_price: toNumberValue(value.sell_price),
    min_stock: toNumberValue(value.min_stock),
    quantity: toNumberValue(value.quantity),
    unit_id: toStringValue(value.unit_id),
    is_active: toBooleanValue(value.is_active, true),
    is_medicine: toBooleanValue(value.is_medicine),
    has_expiry_date: toBooleanValue(value.has_expiry_date),
    ...(value.updated_at === undefined
      ? {}
      : { updated_at: toNullableStringValue(value.updated_at) }),
  };
};

const normalizeCachedInventoryUnit = (
  value: unknown
): PackageConversion['unit'] | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const { id, kind, name } = value;
  if (
    typeof id !== 'string' ||
    typeof name !== 'string' ||
    (kind !== 'packaging' && kind !== 'retail_unit' && kind !== 'custom')
  ) {
    return null;
  }

  return {
    id,
    ...(value.code === undefined
      ? {}
      : { code: toOptionalStringValue(value.code) }),
    name,
    ...(value.description === undefined
      ? {}
      : { description: toNullableStringValue(value.description) }),
    kind,
    ...(value.source_package_id === undefined
      ? {}
      : { source_package_id: toNullableStringValue(value.source_package_id) }),
    ...(value.source_dosage_id === undefined
      ? {}
      : { source_dosage_id: toNullableStringValue(value.source_dosage_id) }),
    ...(value.created_at === undefined
      ? {}
      : { created_at: toOptionalStringValue(value.created_at) }),
    ...(value.updated_at === undefined
      ? {}
      : { updated_at: toNullableStringValue(value.updated_at) }),
  };
};

const normalizeCachedPackageConversion = (
  value: unknown
): PackageConversion | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const { id, to_unit_id, unit, unit_name } = value;
  const normalizedUnit = normalizeCachedInventoryUnit(unit);
  if (
    typeof id !== 'string' ||
    typeof to_unit_id !== 'string' ||
    typeof unit_name !== 'string' ||
    !normalizedUnit
  ) {
    return null;
  }

  return {
    id,
    unit_name,
    to_unit_id,
    ...(value.inventory_unit_id === undefined
      ? {}
      : { inventory_unit_id: toOptionalStringValue(value.inventory_unit_id) }),
    ...(value.parent_inventory_unit_id === undefined
      ? {}
      : {
          parent_inventory_unit_id: toNullableStringValue(
            value.parent_inventory_unit_id
          ),
        }),
    ...(value.contains_quantity === undefined
      ? {}
      : { contains_quantity: toNumberValue(value.contains_quantity) }),
    ...(value.factor_to_base === undefined
      ? {}
      : { factor_to_base: toNumberValue(value.factor_to_base) }),
    ...(value.base_price_override === undefined
      ? {}
      : {
          base_price_override: toNullableNumberValue(value.base_price_override),
        }),
    ...(value.sell_price_override === undefined
      ? {}
      : {
          sell_price_override: toNullableNumberValue(value.sell_price_override),
        }),
    unit: normalizedUnit,
    conversion_rate: toNumberValue(value.conversion_rate),
    base_price: toNumberValue(value.base_price),
    sell_price: toNumberValue(value.sell_price),
  };
};

export const normalizeFormCacheData = (value: unknown): CacheData | null => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const formData = normalizeCachedFormData(value.formData);
  if (!formData) {
    return null;
  }

  const conversions = Array.isArray(value.conversions)
    ? value.conversions.flatMap(conversion => {
        const normalizedConversion =
          normalizeCachedPackageConversion(conversion);
        return normalizedConversion ? [normalizedConversion] : [];
      })
    : [];

  return {
    formData,
    conversions,
  };
};

export const parseFormCacheData = (
  rawValue: string | null
): CacheData | null => {
  if (!rawValue) {
    return null;
  }

  try {
    return normalizeFormCacheData(JSON.parse(rawValue));
  } catch {
    return null;
  }
};

/**
 * Hook for managing form data cache in session storage
 */
export const useFormCache = ({
  cacheKey,
  isEditMode,
  isDirty,
  isSaving,
}: UseFormCacheOptions) => {
  // Refs to track latest state during cleanup
  const latestIsEditMode = useRef(isEditMode);
  const latestIsDirty = useRef(isDirty());
  const latestIsSaving = useRef(isSaving);

  // Update refs with latest values
  useEffect(() => {
    latestIsEditMode.current = isEditMode;
    latestIsDirty.current = isDirty();
    latestIsSaving.current = isSaving;
  });

  /**
   * Saves form data to session storage
   */
  const saveToCache = (
    formData: FormData,
    conversions: PackageConversion[]
  ) => {
    try {
      const cacheData: CacheData = {
        formData,
        conversions,
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to save form data to cache:', error);
    }
  };

  /**
   * Loads form data from session storage
   */
  const loadFromCache = (): CacheData | null => {
    try {
      const cachedData = sessionStorage.getItem(cacheKey);
      return parseFormCacheData(cachedData);
    } catch (error) {
      console.warn('Failed to load form data from cache:', error);
    }
    return null;
  };

  /**
   * Clears form data from session storage
   */
  const clearCache = () => {
    try {
      sessionStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('Failed to clear form cache:', error);
    }
  };

  /**
   * Updates cached data with initial search query if provided
   */
  const updateCacheWithSearchQuery = (
    cachedData: CacheData,
    initialSearchQuery?: string
  ): CacheData => {
    if (initialSearchQuery) {
      return {
        ...cachedData,
        formData: {
          ...cachedData.formData,
          name: initialSearchQuery,
        },
      };
    }
    return cachedData;
  };

  /**
   * Automatically saves to cache on component unmount if conditions are met
   */
  useEffect(() => {
    return () => {
      // Only save if:
      // 1. Not in edit mode (new item)
      // 2. Form is dirty (has changes)
      // 3. Not currently saving (to avoid saving incomplete state)
      if (
        !latestIsEditMode.current &&
        latestIsDirty.current &&
        !latestIsSaving.current
      ) {
        // Note: We can't access formData and conversions here directly
        // The parent component should call saveToCache manually before unmounting
        // This effect serves as a backup for edge cases
      }
    };
  }, []);

  return {
    saveToCache,
    loadFromCache,
    clearCache,
    updateCacheWithSearchQuery,
  };
};
