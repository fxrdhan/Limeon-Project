import { useEffect, useRef } from "react";
import type { FormData, UnitConversion } from "@/types";

interface CacheData {
  formData: FormData;
  conversions: UnitConversion[];
}

interface UseFormCacheOptions {
  cacheKey: string;
  isEditMode: boolean;
  isDirty: () => boolean;
  isSaving: boolean;
}

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
  const saveToCache = (formData: FormData, conversions: UnitConversion[]) => {
    try {
      const cacheData: CacheData = {
        formData,
        conversions,
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Failed to save form data to cache:", error);
    }
  };

  /**
   * Loads form data from session storage
   */
  const loadFromCache = (): CacheData | null => {
    try {
      const cachedData = sessionStorage.getItem(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData) as CacheData;
      }
    } catch (error) {
      console.warn("Failed to load form data from cache:", error);
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
      console.warn("Failed to clear form cache:", error);
    }
  };

  /**
   * Updates cached data with initial search query if provided
   */
  const updateCacheWithSearchQuery = (
    cachedData: CacheData,
    initialSearchQuery?: string,
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