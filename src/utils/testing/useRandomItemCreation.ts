/**
 * Random Item Creation Hook
 *
 * Custom hook that orchestrates the entire random item creation process.
 * Handles entity data fetching, random generation, item creation via business logic,
 * and cache invalidation.
 */

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// Business logic imports
import { saveItemBusinessLogic } from '@/features/item-management/application/hooks/core/ItemMutationUtilities';
import { getInvalidationKeys } from '@/constants/queryKeys';
import { useGenericEntityManagement } from '@/features/item-management/application/hooks/collections';

// Testing utilities
import {
  generateRandomItemData,
  validateEntitiesForGeneration,
  getEntitiesLoadingStatus,
  type RandomItemEntities,
} from './randomItemGenerator';

/**
 * Options for random item creation hook
 */
export interface UseRandomItemCreationOptions {
  enabled?: boolean;
}

/**
 * Random item creation hook return type
 */
export interface UseRandomItemCreationReturn {
  /** Function to trigger random item creation */
  createRandomItem: () => Promise<void>;
  /** Whether master data entities are still loading */
  isLoadingEntities: boolean;
  /** Whether all entities are ready for generation */
  entitiesReady: boolean;
}

/**
 * Custom hook for random item creation functionality
 */
export function useRandomItemCreation(
  options: UseRandomItemCreationOptions = {}
): UseRandomItemCreationReturn {
  const { enabled = true } = options;

  const queryClient = useQueryClient();

  // Entity data management
  const categoriesData = useGenericEntityManagement({
    entityType: 'categories',
    enabled,
  });
  const typesData = useGenericEntityManagement({
    entityType: 'types',
    enabled,
  });
  const packagesData = useGenericEntityManagement({
    entityType: 'packages',
    enabled,
  });
  const dosagesData = useGenericEntityManagement({
    entityType: 'dosages',
    enabled,
  });
  const manufacturersData = useGenericEntityManagement({
    entityType: 'manufacturers',
    enabled,
  });

  // Compute loading and ready states
  const isLoadingEntities = getEntitiesLoadingStatus({
    categoriesLoading: categoriesData.isLoading,
    typesLoading: typesData.isLoading,
    packagesLoading: packagesData.isLoading,
    dosagesLoading: dosagesData.isLoading,
    manufacturersLoading: manufacturersData.isLoading,
  });

  const entities: RandomItemEntities = useMemo(
    () => ({
      categories: categoriesData.data || [],
      types: typesData.data || [],
      packages: packagesData.data || [],
      dosages: dosagesData.data || [],
      manufacturers: manufacturersData.data || [],
    }),
    [
      categoriesData.data,
      typesData.data,
      packagesData.data,
      dosagesData.data,
      manufacturersData.data,
    ]
  );

  const entitiesReady = validateEntitiesForGeneration(entities);

  // Main creation function
  const createRandomItem = useCallback(async () => {
    // Validate entities are ready
    if (!entitiesReady) {
      toast.error('Mohon tunggu sampai data master dimuat lengkap');
      return;
    }

    const createItemPromise = async () => {
      // Generate random item data
      const { itemFormData } = generateRandomItemData(entities);

      // Use business logic to create item with auto-generated code
      // manufacturer_id FK is already set in itemFormData, no separate update needed!
      const result = await saveItemBusinessLogic({
        formData: itemFormData,
        conversions: [], // No package conversions for testing data
        baseUnit: '', // Will be determined by business logic
        isEditMode: false,
      });

      // Trigger cache invalidation to refresh UI
      const keysToInvalidate = getInvalidationKeys.items.all();
      keysToInvalidate.forEach(keySet => {
        queryClient.invalidateQueries({ queryKey: keySet });
        queryClient.refetchQueries({ queryKey: keySet });
      });

      return result;
    };

    toast.promise(
      createItemPromise(),
      {
        loading: 'Membuat item acak...',
        success: result => `Item berhasil dibuat dengan kode: ${result.code}`,
        error: error => `Gagal membuat item acak: ${error.message}`,
      },
      {
        style: {
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
        },
        success: {
          style: {
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            backgroundColor: 'oklch(26.2% 0.051 172.552 / 0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid oklch(26.2% 0.051 172.552 / 0.2)',
            color: 'white',
          },
        },
        error: {
          style: {
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            backgroundColor: 'oklch(27.1% 0.105 12.094 / 0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid oklch(27.1% 0.105 12.094 / 0.2)',
            color: 'white',
          },
        },
      }
    );
  }, [entities, entitiesReady, queryClient]);

  return {
    createRandomItem,
    isLoadingEntities,
    entitiesReady,
  };
}
