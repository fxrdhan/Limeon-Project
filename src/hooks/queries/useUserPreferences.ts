import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  userPreferencesService,
  PREFERENCE_KEYS,
  type PreferenceKey,
} from '@/services/api/userPreferences.service';
import { useAlert } from '@/components/alert/hooks';

// Query keys for user preferences
export const USER_PREFERENCES_QUERY_KEYS = {
  all: ['userPreferences'] as const,
  byKey: (key: string) =>
    [...USER_PREFERENCES_QUERY_KEYS.all, 'key', key] as const,
  allPreferences: () => [...USER_PREFERENCES_QUERY_KEYS.all, 'list'] as const,
} as const;

/**
 * Hook to get a specific user preference
 */
export const useUserPreference = (
  preferenceKey: PreferenceKey,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: USER_PREFERENCES_QUERY_KEYS.byKey(preferenceKey),
    queryFn: async () => {
      const result =
        await userPreferencesService.getUserPreference(preferenceKey);
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Hook to get all user preferences
 */
export const useAllUserPreferences = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: USER_PREFERENCES_QUERY_KEYS.allPreferences(),
    queryFn: async () => {
      const result = await userPreferencesService.getAllUserPreferences();
      if (result.error) throw result.error;
      return result.data;
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

/**
 * Hook for user preference mutations
 */
export const useUserPreferenceMutations = () => {
  const queryClient = useQueryClient();
  const alert = useAlert();

  const setPreference = useMutation({
    mutationFn: async ({
      key,
      value,
    }: {
      key: PreferenceKey;
      value: Record<string, unknown>;
    }) => {
      const result = await userPreferencesService.setUserPreference(key, value);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (data, variables) => {
      // Update cache for specific preference
      queryClient.setQueryData(
        USER_PREFERENCES_QUERY_KEYS.byKey(variables.key),
        data
      );

      // Invalidate all preferences to keep them in sync
      queryClient.invalidateQueries({
        queryKey: USER_PREFERENCES_QUERY_KEYS.allPreferences(),
      });
    },
    onError: error => {
      console.error('Failed to save user preference:', error);
      alert.error('Gagal menyimpan pengaturan pengguna');
    },
  });

  const deletePreference = useMutation({
    mutationFn: async (key: PreferenceKey) => {
      const result = await userPreferencesService.deleteUserPreference(key);
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: (_, variables) => {
      // Remove from cache
      queryClient.setQueryData(
        USER_PREFERENCES_QUERY_KEYS.byKey(variables),
        null
      );

      // Invalidate all preferences
      queryClient.invalidateQueries({
        queryKey: USER_PREFERENCES_QUERY_KEYS.allPreferences(),
      });
    },
    onError: error => {
      console.error('Failed to delete user preference:', error);
      alert.error('Gagal menghapus pengaturan pengguna');
    },
  });

  const resetAllPreferences = useMutation({
    mutationFn: async () => {
      const result = await userPreferencesService.resetAllUserPreferences();
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      // Clear all preference caches
      queryClient.invalidateQueries({
        queryKey: USER_PREFERENCES_QUERY_KEYS.all,
      });
      alert.success('Semua pengaturan berhasil direset');
    },
    onError: error => {
      console.error('Failed to reset user preferences:', error);
      alert.error('Gagal mereset pengaturan pengguna');
    },
  });

  return {
    setPreference,
    deletePreference,
    resetAllPreferences,
  };
};

// Entity type to preference key mapping
export const ENTITY_PREFERENCE_KEY_MAP = {
  items: PREFERENCE_KEYS.ITEM_COLUMN_VISIBILITY,
  categories: PREFERENCE_KEYS.CATEGORY_COLUMN_VISIBILITY,
  types: PREFERENCE_KEYS.TYPE_COLUMN_VISIBILITY,
  packages: PREFERENCE_KEYS.PACKAGE_COLUMN_VISIBILITY,
  dosages: PREFERENCE_KEYS.DOSAGE_COLUMN_VISIBILITY,
  manufacturers: PREFERENCE_KEYS.MANUFACTURER_COLUMN_VISIBILITY,
  units: PREFERENCE_KEYS.UNIT_COLUMN_VISIBILITY,
} as const;

// Entity type to column pinning preference key mapping
export const ENTITY_PINNING_PREFERENCE_KEY_MAP = {
  items: PREFERENCE_KEYS.ITEM_COLUMN_PINNING,
  categories: PREFERENCE_KEYS.CATEGORY_COLUMN_PINNING,
  types: PREFERENCE_KEYS.TYPE_COLUMN_PINNING,
  packages: PREFERENCE_KEYS.PACKAGE_COLUMN_PINNING,
  dosages: PREFERENCE_KEYS.DOSAGE_COLUMN_PINNING,
  manufacturers: PREFERENCE_KEYS.MANUFACTURER_COLUMN_PINNING,
  units: PREFERENCE_KEYS.UNIT_COLUMN_PINNING,
} as const;

// Entity type to column ordering preference key mapping
export const ENTITY_ORDERING_PREFERENCE_KEY_MAP = {
  items: PREFERENCE_KEYS.ITEM_COLUMN_ORDER,
  categories: PREFERENCE_KEYS.CATEGORY_COLUMN_ORDER,
  types: PREFERENCE_KEYS.TYPE_COLUMN_ORDER,
  packages: PREFERENCE_KEYS.PACKAGE_COLUMN_ORDER,
  dosages: PREFERENCE_KEYS.DOSAGE_COLUMN_ORDER,
  manufacturers: PREFERENCE_KEYS.MANUFACTURER_COLUMN_ORDER,
  units: PREFERENCE_KEYS.UNIT_COLUMN_ORDER,
} as const;

export type UserPreferenceEntityType = keyof typeof ENTITY_PREFERENCE_KEY_MAP;

/**
 * Generic hook for entity column visibility preferences
 */
export const useEntityColumnVisibilityPreference = (
  entityType: UserPreferenceEntityType
) => {
  const preferenceKey = ENTITY_PREFERENCE_KEY_MAP[entityType];

  const {
    data: preference,
    isLoading,
    error,
  } = useUserPreference(preferenceKey, { enabled: true });

  const { setPreference } = useUserPreferenceMutations();

  const setColumnVisibility = async (visibility: Record<string, boolean>) => {
    await setPreference.mutateAsync({
      key: preferenceKey,
      value: visibility,
    });
  };

  return {
    columnVisibility: preference?.preference_value as
      | Record<string, boolean>
      | undefined,
    isLoading: isLoading || setPreference.isPending,
    error: error || setPreference.error,
    setColumnVisibility,
  };
};

/**
 * Generic hook for entity column pinning preferences
 */
export const useEntityColumnPinningPreference = (
  entityType: UserPreferenceEntityType
) => {
  const preferenceKey = ENTITY_PINNING_PREFERENCE_KEY_MAP[entityType];

  const {
    data: preference,
    isLoading,
    error,
  } = useUserPreference(preferenceKey, { enabled: true });

  const { setPreference } = useUserPreferenceMutations();

  const setColumnPinning = async (
    pinning: Record<string, 'left' | 'right' | null>
  ) => {
    await setPreference.mutateAsync({
      key: preferenceKey,
      value: pinning,
    });
  };

  return {
    columnPinning: preference?.preference_value as
      | Record<string, 'left' | 'right' | null>
      | undefined,
    isLoading: isLoading || setPreference.isPending,
    error: error || setPreference.error,
    setColumnPinning,
  };
};

/**
 * Generic hook for entity column ordering preferences
 */
export const useEntityColumnOrderingPreference = (
  entityType: UserPreferenceEntityType
) => {
  const preferenceKey = ENTITY_ORDERING_PREFERENCE_KEY_MAP[entityType];

  const {
    data: preference,
    isLoading,
    error,
  } = useUserPreference(preferenceKey, { enabled: true });

  const { setPreference } = useUserPreferenceMutations();

  const setColumnOrder = async (order: string[]) => {
    await setPreference.mutateAsync({
      key: preferenceKey,
      value: { order },
    });
  };

  return {
    columnOrder: preference?.preference_value?.order as string[] | undefined,
    isLoading: isLoading || setPreference.isPending,
    error: error || setPreference.error,
    setColumnOrder,
  };
};

/**
 * Utility hook for item column visibility preference (backward compatibility)
 */
export const useColumnVisibilityPreference = () => {
  return useEntityColumnVisibilityPreference('items');
};

/**
 * Utility hook for item column pinning preference (backward compatibility)
 */
export const useColumnPinningPreference = () => {
  return useEntityColumnPinningPreference('items');
};

/**
 * Utility hook for item column ordering preference (backward compatibility)
 */
export const useColumnOrderingPreference = () => {
  return useEntityColumnOrderingPreference('items');
};
