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

/**
 * Hook for item column display mode preferences (kode/nama toggle)
 */
export const useColumnDisplayModePreference = () => {
  const preferenceKey = PREFERENCE_KEYS.ITEM_COLUMN_DISPLAY_MODE;

  const {
    data: preference,
    isLoading,
    error,
  } = useUserPreference(preferenceKey, { enabled: true });

  const { setPreference } = useUserPreferenceMutations();

  const setColumnDisplayModes = async (
    modes: Record<string, 'name' | 'code'>
  ) => {
    await setPreference.mutateAsync({
      key: preferenceKey,
      value: modes,
    });
  };

  return {
    columnDisplayModes: preference?.preference_value as
      | Record<string, 'name' | 'code'>
      | undefined,
    isLoading: isLoading || setPreference.isPending,
    error: error || setPreference.error,
    setColumnDisplayModes,
  };
};
