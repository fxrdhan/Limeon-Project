/**
 * Entity Hook - Configuration-driven entity data management
 *
 * Centralized hook for managing all entity types with consistent interface.
 * Uses configuration system for type-safe operations.
 *
 * Benefits:
 * - Single interface for all entity types
 * - Type-safe operations
 * - Configuration-driven
 * - Maintainable and extensible
 */

import { useMemo } from 'react';
import type { EntityData, ManagedEntityType } from './useEntityManager';
import {
  getExternalHooks,
  isEntityTypeSupported,
} from '../core/GenericHookFactories';
import { filterEntityData } from './entityFiltering';

export interface EntityOptions {
  entityType: ManagedEntityType;
  search?: string;
  itemsPerPage?: number;
  enabled?: boolean;
}

/**
 * Get hooks for entity type using configuration system
 */
const getHooksForEntityType = (entityType: ManagedEntityType) => {
  if (!isEntityTypeSupported(entityType)) {
    throw new Error(`Unsupported entity type: ${String(entityType)}`);
  }

  return getExternalHooks(entityType);
};

export const useEntity = (options: EntityOptions) => {
  const {
    entityType,
    search = '',
    itemsPerPage = 25,
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
    isPlaceholderData,
  } = hooks.useData({ enabled });

  // Get mutations
  const mutations = hooks.useMutations();

  // Filter data (no pagination - let AG Grid handle it)
  const filteredData = useMemo(() => {
    return filterEntityData({
      data: allData as EntityData[],
      searchTerm: search,
    });
  }, [allData, search]);

  return {
    // Data - return all filtered data for AG Grid pagination
    data: filteredData,
    allData,
    totalItems: filteredData.length,
    totalPages: Math.ceil((filteredData?.length || 0) / itemsPerPage),

    // Loading states
    isLoading,
    isError,
    error,
    isFetching,
    isPlaceholderData,

    // Mutations
    mutations,

    // Computed
    isEmpty: filteredData.length === 0,
    hasData: filteredData.length > 0,
  };
};
