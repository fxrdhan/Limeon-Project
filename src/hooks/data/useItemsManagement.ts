import { useState, useMemo } from 'react';
import { useItems } from '@/hooks/queries/useItems';
import { fuzzyMatch, getScore } from '@/utils/search';
import { useEffect } from 'react';
import type { Item } from '@/types/database';
import {
  preloadImages,
  removeCachedImageSet,
  setCachedImageSet,
} from '@/utils/imageCache';

/**
 * Items Management Hook - Focused and Simple
 *
 * Replaces the monolithic useMasterDataManagement for items-only usage.
 * This hook focuses solely on items data management with search functionality.
 *
 * Benefits over useMasterDataManagement:
 * - 90%+ code reduction (809 lines → ~80 lines)
 * - Single responsibility (items only)
 * - No switch statements
 * - No type casting issues
 * - No generic abstraction complexity
 * - Better maintainability
 */

export interface UseItemsManagementOptions {
  enabled?: boolean;
  initialSearch?: string;
}

export const useItemsManagement = (options?: UseItemsManagementOptions) => {
  const { enabled = true, initialSearch = '' } = options || {};

  // Search state management
  const [search, setSearch] = useState(initialSearch);

  // Pagination state for grid configuration
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Fetch items data using existing useItems hook
  const {
    data: allData = [],
    isLoading,
    isError,
    error: queryError,
    isFetching,
    isPlaceholderData,
  } = useItems({
    enabled,
    orderBy: { column: 'name', ascending: true },
  });

  useEffect(() => {
    (allData as Item[]).forEach(item => {
      if (!item.id || !Array.isArray(item.image_urls)) return;
      const cacheKey = `item-images:${item.id}`;
      const urls = item.image_urls;
      if (urls.some(Boolean)) {
        setCachedImageSet(cacheKey, urls);
        preloadImages(urls.filter(Boolean));
      } else {
        removeCachedImageSet(cacheKey);
      }
    });
  }, [allData]);

  // Filter items based on search query
  const filteredData = useMemo(() => {
    if (!search || search.trim() === '') {
      return allData;
    }

    const searchTermLower = search.toLowerCase();

    return (allData as Item[])
      .filter(item => {
        return (
          fuzzyMatch(item.name, searchTermLower) ||
          (item.code && fuzzyMatch(item.code, searchTermLower)) ||
          (item.barcode && fuzzyMatch(item.barcode, searchTermLower)) ||
          (item.category?.name &&
            fuzzyMatch(item.category.name, searchTermLower)) ||
          (item.type?.name && fuzzyMatch(item.type.name, searchTermLower)) ||
          (item.unit?.name && fuzzyMatch(item.unit.name, searchTermLower)) ||
          (item.base_price &&
            fuzzyMatch(item.base_price.toString(), searchTermLower)) ||
          (item.sell_price &&
            fuzzyMatch(item.sell_price.toString(), searchTermLower)) ||
          (item.stock && fuzzyMatch(item.stock.toString(), searchTermLower)) ||
          (item.package_conversions &&
            item.package_conversions.some(
              uc => uc.unit?.name && fuzzyMatch(uc.unit.name, searchTermLower)
            ))
        );
      })
      .sort((a, b) => {
        const scoreA = getScore(a, searchTermLower);
        const scoreB = getScore(b, searchTermLower);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.name.localeCompare(b.name);
      });
  }, [allData, search]);

  // Calculate pagination metrics
  const totalItems = filteredData?.length || 0;

  return {
    // Data
    data: filteredData || [],
    allData,
    totalItems,

    // Loading states
    isLoading,
    isError,
    queryError,
    isFetching,
    isPlaceholderData,

    // Search state
    search,
    setSearch,

    // Pagination state
    itemsPerPage,
    setItemsPerPage,

    // Computed properties
    isEmpty: (filteredData?.length || 0) === 0,
    hasData: (filteredData?.length || 0) > 0,
  };
};
