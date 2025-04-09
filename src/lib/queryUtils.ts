import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

// Fungsi untuk mengambil data dengan cache
export function useSupabaseQuery(key, fetcher, options = {}) {
  return useQuery({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: fetcher,
    ...options,
  });
}

// Fungsi untuk mutasi data dengan invalidasi cache otomatis
export function useSupabaseMutation(key, mutationFn, options = {}) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn,
    onSuccess: (data, variables, context) => {
      // Invalidasi cache setelah mutasi berhasil
      if (Array.isArray(key)) {
        queryClient.invalidateQueries({ queryKey: key });
      } else {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    ...options,
  });
}

// Fungsi untuk mendengarkan perubahan data di Supabase
export function useSupabaseSubscription(tableName, onDataChange) {
  const queryClient = useQueryClient();
  
  React.useEffect(() => {
    const subscription = supabase
      .channel(`public:${tableName}`)
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: tableName }, 
          (payload) => {
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