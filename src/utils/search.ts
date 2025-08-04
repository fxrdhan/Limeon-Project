import type { Item } from '@/types';

export const fuzzyMatch = (text: string, pattern: string): boolean => {
  const lowerText = text?.toLowerCase?.() ?? '';
  const lowerPattern = pattern?.toLowerCase?.() ?? '';
  let tIdx = 0;
  let pIdx = 0;
  while (tIdx < lowerText.length && pIdx < lowerPattern.length) {
    if (lowerText[tIdx] === lowerPattern[pIdx]) {
      pIdx++;
    }
    tIdx++;
  }
  return pIdx === lowerPattern.length;
};

// Generic fuzzy search for any object - searches through all string/number fields
export const fuzzySearchMatch = (
  data: Record<string, unknown>,
  searchTerm: string
): boolean => {
  if (!searchTerm || !data) return true;

  const search = searchTerm.toLowerCase();

  // Helper function to recursively search through object properties
  const searchInValue = (value: unknown): boolean => {
    if (value === null || value === undefined) return false;

    if (typeof value === 'string') {
      return fuzzyMatch(value, search);
    }

    if (typeof value === 'number') {
      return fuzzyMatch(value.toString(), search);
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Search in nested objects (like category.name, type.name)
      return Object.values(value).some(nestedValue =>
        searchInValue(nestedValue)
      );
    }

    if (Array.isArray(value)) {
      // Search in arrays (like package_conversions)
      return value.some(item => searchInValue(item));
    }

    return false;
  };

  // Search through all properties of the data object
  return Object.values(data).some(value => searchInValue(value));
};

export const getScore = (item: Item, searchTermLower: string): number => {
  const nameLower = item.name?.toLowerCase?.() ?? '';
  const codeLower = item.code?.toLowerCase?.() ?? '';
  const barcodeLower = item.barcode?.toLowerCase?.() ?? '';
  const categoryLower = item.category?.name?.toLowerCase?.() ?? '';
  const typeLower = item.type?.name?.toLowerCase?.() ?? '';
  const unitLower = item.unit?.name?.toLowerCase?.() ?? '';
  const basePriceLower = item.base_price?.toString?.()?.toLowerCase?.() ?? '';
  const sellPriceLower = item.sell_price?.toString?.()?.toLowerCase?.() ?? '';
  const stockLower = item.stock?.toString?.()?.toLowerCase?.() ?? '';

  // Higher scores for more important fields
  if (nameLower.includes(searchTermLower)) return 10;
  if (codeLower.includes(searchTermLower)) return 9;
  if (barcodeLower.includes(searchTermLower)) return 8;
  if (categoryLower.includes(searchTermLower)) return 7;
  if (typeLower.includes(searchTermLower)) return 6;
  if (unitLower.includes(searchTermLower)) return 5;
  if (basePriceLower.includes(searchTermLower)) return 4;
  if (sellPriceLower.includes(searchTermLower)) return 3;
  if (stockLower.includes(searchTermLower)) return 2;

  // Check package conversions
  if (
    item.package_conversions &&
    item.package_conversions.some(uc =>
      uc.unit?.name?.toLowerCase?.()?.includes(searchTermLower)
    )
  )
    return 1;

  return 0;
};

export const getSearchState = (
  search: string,
  debouncedSearch: string,
  dataArray: unknown[] | null | undefined
): 'idle' | 'typing' | 'found' | 'not-found' => {
  if (!search) return 'idle';
  if (search && !debouncedSearch) return 'typing';
  if (debouncedSearch && dataArray && dataArray.length > 0) return 'found';
  if (debouncedSearch && dataArray && dataArray.length === 0)
    return 'not-found';
  return 'idle';
};
