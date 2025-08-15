/**
 * Random Item Creation Hook
 * 
 * Custom hook that orchestrates the entire random item creation process.
 * Handles entity data fetching, random generation, item creation via business logic,
 * and cache invalidation.
 */

import { useState, useCallback, useMemo } from 'react';
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
  type RandomItemEntities 
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
  /** Whether item creation is in progress */
  isCreating: boolean;
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
  const [isCreating, setIsCreating] = useState(false);

  // Entity data management
  const categoriesData = useGenericEntityManagement({ 
    entityType: 'categories', 
    enabled 
  });
  const typesData = useGenericEntityManagement({ 
    entityType: 'types', 
    enabled 
  });
  const packagesData = useGenericEntityManagement({ 
    entityType: 'packages', 
    enabled 
  });
  const dosagesData = useGenericEntityManagement({ 
    entityType: 'dosages', 
    enabled 
  });
  const manufacturersData = useGenericEntityManagement({ 
    entityType: 'manufacturers', 
    enabled 
  });

  // Compute loading and ready states
  const isLoadingEntities = getEntitiesLoadingStatus({
    categoriesLoading: categoriesData.isLoading,
    typesLoading: typesData.isLoading,
    packagesLoading: packagesData.isLoading,
    dosagesLoading: dosagesData.isLoading,
    manufacturersLoading: manufacturersData.isLoading,
  });

  const entities: RandomItemEntities = useMemo(() => ({
    categories: categoriesData.data || [],
    types: typesData.data || [],
    packages: packagesData.data || [],
    dosages: dosagesData.data || [],
    manufacturers: manufacturersData.data || [],
  }), [
    categoriesData.data,
    typesData.data,
    packagesData.data,
    dosagesData.data,
    manufacturersData.data,
  ]);

  const entitiesReady = validateEntitiesForGeneration(entities);

  // Main creation function
  const createRandomItem = useCallback(async () => {
    // Prevent multiple simultaneous creations
    if (isCreating) return;

    // Validate entities are ready
    if (!entitiesReady) {
      toast.error('Mohon tunggu sampai data master dimuat lengkap');
      return;
    }

    setIsCreating(true);
    
    try {
      // Generate random item data
      const { itemFormData, manufacturer } = generateRandomItemData(entities);
      
      // Use business logic to create item with auto-generated code
      const result = await saveItemBusinessLogic({
        formData: itemFormData,
        conversions: [], // No package conversions for testing data
        baseUnit: '', // Will be determined by business logic
        isEditMode: false,
      });

      // Update manufacturer name in database after creation
      if (result.itemId && manufacturer) {
        const { supabase } = await import('@/lib/supabase');
        await supabase
          .from('items')
          .update({ manufacturer })
          .eq('id', result.itemId);
      }

      // Trigger cache invalidation to refresh UI
      const keysToInvalidate = getInvalidationKeys.items.all();
      keysToInvalidate.forEach(keySet => {
        queryClient.invalidateQueries({ queryKey: keySet });
        queryClient.refetchQueries({ queryKey: keySet });
      });
      
      // Show success notification
      toast.success(`Item berhasil dibuat dengan kode: ${result.code}`);
      
    } catch (error) {
      console.error('Failed to create random item:', error);
      toast.error('Gagal membuat item acak: ' + (error as Error).message);
    } finally {
      setIsCreating(false);
    }
  }, [entities, entitiesReady, isCreating, queryClient]);

  return {
    createRandomItem,
    isCreating,
    isLoadingEntities,
    entitiesReady,
  };
}