import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
  UseQueryOptions,
  UseMutationOptions,
  MutationFunction,
} from '@tanstack/react-query';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'; // Import Supabase specific type
import { supabase } from './supabase';
import React from 'react'; // Import React for useEffect

// Fungsi untuk mengambil data dengan cache
export function useSupabaseQuery<TQueryFnData = unknown, TError = Error, TData = TQueryFnData>(
  key: QueryKey,
  fetcher: () => Promise<TQueryFnData>,
  options: Omit<UseQueryOptions<TQueryFnData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'> = {},
) {
  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: fetcher,
    ...options,
  });
}

// Fungsi untuk mutasi data dengan invalidasi cache otomatis
export function useSupabaseMutation<TData = unknown, TError = Error, TVariables = void, TContext = unknown>(
  key: QueryKey | string, // Allow string or array key
  mutationFn: MutationFunction<TData, TVariables>,
  options: Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data: TData, variables: TVariables, context: TContext | undefined) => {
      // Invalidasi cache setelah mutasi berhasil
      if (Array.isArray(key)) {
        queryClient.invalidateQueries({ queryKey: key });
      } else {
        queryClient.invalidateQueries({ queryKey: [key] });
      }

      // Call original onSuccess if provided
      if (options?.onSuccess) {
        if (context !== undefined) { // Check if context is not undefined before calling
          options.onSuccess(data, variables, context);
        }
      }
    },
    ...options,
  });
}

// Fungsi untuk mendengarkan perubahan data di Supabase
export function useSupabaseSubscription<T extends Record<string, unknown> = Record<string, unknown>>( // Use Record<string, unknown> instead of any
  tableName: string,
  onDataChange: (payload: RealtimePostgresChangesPayload<T>) => void,
) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const subscription = supabase
      .channel(`public:${tableName}`)
      .on('postgres_changes',
          { event: '*', schema: 'public', table: tableName },
          (payload: RealtimePostgresChangesPayload<T>) => {
            // Eksekusi callback yang diberikan
            if (onDataChange) {
              onDataChange(payload);
            }

            // Invalidasi query terkait
            queryClient.invalidateQueries({ queryKey: [tableName] });
          })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [tableName, onDataChange, queryClient]);
}