import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface UseSimpleRealtimeOptions {
  table: string;
  queryKeys: (readonly string[])[];
  enabled?: boolean;
}

/**
 * Simple realtime hook with fallback to polling
 * Handles conflicts with presence system gracefully
 */
export const useSimpleRealtime = ({ table, queryKeys, enabled = true }: UseSimpleRealtimeOptions) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Try realtime first, fallback to polling if fails
    const setupRealtime = () => {
      // Create unique channel to avoid conflicts
      const channelId = `pg-changes-${table}-${Math.random().toString(36).substr(2, 9)}`;
      
      const channel = supabase
        .channel(channelId, {
          config: {
            broadcast: { self: false },
            presence: { key: '' }, // Disable presence to avoid conflicts
          },
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
          },
          () => {
            // Invalidate queries on any change
            queryKeys.forEach(queryKey => {
              queryClient.invalidateQueries({ queryKey });
            });
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR') {
            // Only log errors, setup polling fallback
            console.warn(`Realtime failed for ${table}, using polling fallback:`, err?.message);
            setupPolling();
          }
        });

      channelRef.current = channel;
    };

    // Polling fallback
    const setupPolling = () => {
      if (intervalRef.current) return; // Already polling
      
      intervalRef.current = setInterval(() => {
        queryKeys.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }, 3000); // Poll every 3 seconds
    };

    // Start with realtime attempt
    try {
      setupRealtime();
    } catch (error) {
      console.warn(`Failed to setup realtime for ${table}:`, error);
      setupPolling();
    }

    // Cleanup function
    return () => {
      // Clear polling interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Unsubscribe from realtime channel
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch (error) {
          console.warn(`Failed to unsubscribe from ${table}:`, error);
        }
        channelRef.current = null;
      }
    };
  }, [table, queryClient, enabled, queryKeys]);
};