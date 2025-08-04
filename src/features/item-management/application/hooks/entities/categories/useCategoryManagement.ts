import { useMemo } from 'react';
import { useCategoriesRealtime, useCategoryMutations } from '@/hooks/queries';
import { fuzzyMatch } from '@/utils/search';
import type { ItemCategory } from '../../../../domain/entities';

export interface UseCategoryManagementOptions {
  search?: string;
  currentPage?: number;
  itemsPerPage?: number;
  enabled?: boolean;
}

export const useCategoryManagement = (options: UseCategoryManagementOptions = {}) => {
  const {
    search = '',
    currentPage = 1,
    itemsPerPage = 10,
    enabled = true,
  } = options;

  // Fetch categories data
  const {
    data: allCategories = [],
    isLoading,
    isError,
    error,
    isFetching,
  } = useCategoriesRealtime({ enabled });

  // Get mutations
  const mutations = useCategoryMutations();

  // Filter and paginate data
  const { currentData, totalItems, totalPages } = useMemo(() => {
    let filteredData = allCategories as ItemCategory[];

    // Apply search filter
    if (search) {
      const searchTermLower = search.toLowerCase();
      filteredData = filteredData
        .filter(category => {
          return (
            (category.kode && fuzzyMatch(category.kode.toLowerCase(), searchTermLower)) ||
            fuzzyMatch(category.name, searchTermLower) ||
            (category.description && fuzzyMatch(category.description, searchTermLower))
          );
        })
        .sort((a, b) => {
          const getScore = (category: ItemCategory) => {
            if (category.kode && category.kode.toLowerCase().startsWith(searchTermLower)) return 5;
            if (category.kode && category.kode.toLowerCase().includes(searchTermLower)) return 4;
            if (category.name.toLowerCase().startsWith(searchTermLower)) return 3;
            if (category.name.toLowerCase().includes(searchTermLower)) return 2;
            if (category.name && fuzzyMatch(category.name, searchTermLower)) return 1;
            return 0;
          };
          
          const scoreA = getScore(a);
          const scoreB = getScore(b);
          if (scoreA !== scoreB) return scoreB - scoreA;
          
          // Secondary sort by kode, then name
          if (a.kode && b.kode) return a.kode.localeCompare(b.kode);
          return a.name.localeCompare(b.name);
        });
    }

    // Apply pagination
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    return {
      currentData: paginatedData,
      totalItems,
      totalPages,
    };
  }, [allCategories, search, currentPage, itemsPerPage]);

  return {
    // Data
    data: currentData,
    allData: allCategories,
    totalItems,
    totalPages,
    
    // Loading states
    isLoading,
    isError,
    error,
    isFetching,
    
    // Mutations
    mutations,
    
    // Computed
    isEmpty: currentData.length === 0,
    hasData: currentData.length > 0,
  };
};