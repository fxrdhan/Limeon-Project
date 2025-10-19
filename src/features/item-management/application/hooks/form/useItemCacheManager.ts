import { useFormCache } from '@/hooks/forms/useFormCache';
import { CACHE_KEY } from '../../../constants';
import type { ItemFormData, PackageConversion } from '../../../shared/types';

interface UseItemCacheManagerProps {
  formState: {
    isEditMode: boolean;
    saving: boolean;
    isDirty: (conversions: PackageConversion[]) => boolean;
    formData: ItemFormData;
  };
  conversions: PackageConversion[];
}

/**
 * Hook for managing form cache and persistence
 *
 * Handles:
 * - Cache loading and saving
 * - Dirty state tracking
 * - Search query cache updates
 */
export const useItemCacheManager = ({
  formState,
  conversions,
}: UseItemCacheManagerProps) => {
  // Initialize cache management
  const cache = useFormCache({
    cacheKey: CACHE_KEY,
    isEditMode: formState.isEditMode,
    isDirty: () => formState.isDirty(conversions),
    isSaving: formState.saving,
  });

  return cache;
};
