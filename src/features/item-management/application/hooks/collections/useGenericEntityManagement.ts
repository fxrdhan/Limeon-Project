import { useMemo } from 'react';
import { fuzzyMatch } from '@/utils/search';
import type { EntityData, EntityType } from './useEntityManager';

// Import regular query hooks (realtime handled at page level)
import {
  useCategories,
  useMedicineTypes,
  useUnits,
  useItemUnits,
  useCategoryMutations,
  useMedicineTypeMutations,
  useUnitMutations,
  useItemUnitMutations,
} from '@/hooks/queries/useMasterData';
import { useDosages, useDosageMutations } from '@/hooks/queries/useDosages';
import {
  useManufacturers,
  useManufacturerMutations,
} from '@/hooks/queries/useManufacturers';

export interface UseGenericEntityManagementOptions {
  entityType: EntityType;
  search?: string;
  currentPage?: number;
  itemsPerPage?: number;
  enabled?: boolean;
}

// Simple hook selector - using regular query hooks (realtime handled at page level)
const getHooksForEntityType = (entityType: EntityType) => {
  interface QueryOptions {
    enabled?: boolean;
    filters?: Record<string, unknown>;
    orderBy?: { column: string; ascending?: boolean };
  }

  switch (entityType) {
    case 'categories':
      return {
        useData: (options: QueryOptions) => useCategories(options),
        useMutations: useCategoryMutations,
      };
    case 'types':
      return {
        useData: (options: QueryOptions) => useMedicineTypes(options),
        useMutations: useMedicineTypeMutations,
      };
    case 'packages':
      return {
        useData: (options: QueryOptions) => useUnits(options),
        useMutations: useUnitMutations,
      };
    case 'units':
      return {
        useData: (options: QueryOptions) => useItemUnits(options),
        useMutations: useItemUnitMutations,
      };
    case 'dosages':
      return {
        useData: (options: QueryOptions) => useDosages(options),
        useMutations: useDosageMutations,
      };
    case 'manufacturers':
      return {
        useData: (options: QueryOptions) => useManufacturers(options),
        useMutations: useManufacturerMutations,
      };
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
};

export const useGenericEntityManagement = (
  options: UseGenericEntityManagementOptions
) => {
  const {
    entityType,
    search = '',
    currentPage = 1,
    itemsPerPage = 10,
    enabled = true,
  } = options;

  // Get the appropriate hooks for this entity type
  const hooks = getHooksForEntityType(entityType);

  // Fetch data
  const {
    data: allData = [],
    isLoading,
    isError,
    error,
    isFetching,
  } = hooks.useData({ enabled });

  // Get mutations
  const mutations = hooks.useMutations();

  // Filter and paginate data
  const { currentData, totalItems, totalPages } = useMemo(() => {
    let filteredData = allData as EntityData[];

    // Apply search filter
    if (search) {
      const searchTermLower = search.toLowerCase();
      filteredData = filteredData
        .filter(entity => {
          // Check for kode field (most entities)
          if (
            'kode' in entity &&
            typeof entity.kode === 'string' &&
            fuzzyMatch(entity.kode.toLowerCase(), searchTermLower)
          )
            return true;

          // Check for code field (units entity)
          if (
            'code' in entity &&
            typeof entity.code === 'string' &&
            fuzzyMatch(entity.code.toLowerCase(), searchTermLower)
          )
            return true;

          // Check name
          if (entity.name && fuzzyMatch(entity.name, searchTermLower))
            return true;

          // Check description
          if (
            'description' in entity &&
            typeof entity.description === 'string' &&
            fuzzyMatch(entity.description, searchTermLower)
          )
            return true;

          // Check address (for manufacturers)
          if (
            'address' in entity &&
            typeof entity.address === 'string' &&
            fuzzyMatch(entity.address, searchTermLower)
          )
            return true;

          // Check nci_code (for packages and dosages)
          if (
            'nci_code' in entity &&
            typeof entity.nci_code === 'string' &&
            fuzzyMatch(entity.nci_code, searchTermLower)
          )
            return true;

          // Check abbreviation (for units)
          if (
            'abbreviation' in entity &&
            typeof entity.abbreviation === 'string' &&
            fuzzyMatch(entity.abbreviation, searchTermLower)
          )
            return true;

          return false;
        })
        .sort((a, b) => {
          const getScore = (entity: EntityData) => {
            // Check kode/code first (highest priority)
            if (
              'kode' in entity &&
              typeof entity.kode === 'string' &&
              entity.kode.toLowerCase().startsWith(searchTermLower)
            )
              return 5;
            if (
              'kode' in entity &&
              typeof entity.kode === 'string' &&
              entity.kode.toLowerCase().includes(searchTermLower)
            )
              return 4;
            if (
              'code' in entity &&
              typeof entity.code === 'string' &&
              entity.code.toLowerCase().startsWith(searchTermLower)
            )
              return 5;
            if (
              'code' in entity &&
              typeof entity.code === 'string' &&
              entity.code.toLowerCase().includes(searchTermLower)
            )
              return 4;

            // Then check name
            if (
              entity.name &&
              entity.name.toLowerCase().startsWith(searchTermLower)
            )
              return 3;
            if (
              entity.name &&
              entity.name.toLowerCase().includes(searchTermLower)
            )
              return 2;
            if (entity.name && fuzzyMatch(entity.name, searchTermLower))
              return 1;

            return 0;
          };

          const scoreA = getScore(a);
          const scoreB = getScore(b);
          if (scoreA !== scoreB) return scoreB - scoreA;

          // Secondary sort by kode/code if available, then name
          if (
            'kode' in a &&
            'kode' in b &&
            typeof a.kode === 'string' &&
            typeof b.kode === 'string'
          ) {
            return a.kode.localeCompare(b.kode);
          }
          if (
            'code' in a &&
            'code' in b &&
            typeof a.code === 'string' &&
            typeof b.code === 'string'
          ) {
            return a.code.localeCompare(b.code);
          }
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
  }, [allData, search, currentPage, itemsPerPage]);

  return {
    // Data
    data: currentData,
    allData,
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
