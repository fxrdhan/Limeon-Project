import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface UseItemMasterRealtimeOptions {
  enabled?: boolean;
}

/**
 * Simple realtime hook for Item Master page
 * Listens to all master data tables and invalidates queries
 */
// Global ref to prevent multiple instances across all hook instances
let globalSetupRef = false;
let globalChannelRef: ReturnType<typeof supabase.channel> | null = null;

export const useItemMasterRealtime = ({
  enabled = true,
}: UseItemMasterRealtimeOptions = {}) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || globalSetupRef) {
      return;
    }

    // Mark as setup globally
    globalSetupRef = true;

    // Wait for network and DOM ready before setting up realtime
    const timeoutId = setTimeout(() => {
      // Only setup if network is available and document is ready
      if (navigator.onLine && document.readyState === 'complete') {
        console.log('🔗 Setting up Item Master realtime (production)');
        setupRealtimeConnection();
      } else {
        // Retry after another second
        setTimeout(() => {
          console.log('🔗 Setting up Item Master realtime (production)');
          setupRealtimeConnection();
        }, 1000);
      }
    }, 2000); // 2 second delay

    const setupRealtimeConnection = () => {
      const handleTableChange = (
        tableName: string,
        payload: {
          eventType: string;
          new?: Record<string, unknown>;
          old?: Record<string, unknown>;
          commit_timestamp?: string;
        }
      ) => {
        console.log(`🔄 ${tableName} ${payload.eventType}:`);
        console.log('📦 Raw payload:', payload);
        console.log('🔵 New data:', payload.new);
        console.log('🔴 Old data:', payload.old);
        console.log('⏰ Timestamp:', payload.commit_timestamp);
        console.log('---');

        // Invalidate all item master queries
        queryClient.invalidateQueries({ queryKey: ['items'] });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        queryClient.invalidateQueries({ queryKey: ['types'] });
        queryClient.invalidateQueries({ queryKey: ['units'] });
        queryClient.invalidateQueries({ queryKey: ['item_units'] });
        queryClient.invalidateQueries({ queryKey: ['packages'] });
        queryClient.invalidateQueries({ queryKey: ['item_packages'] });
        queryClient.invalidateQueries({ queryKey: ['dosages'] });
        queryClient.invalidateQueries({ queryKey: ['manufacturers'] });
      };

      // All item master tables
      const tables = [
        'items',
        'item_categories',
        'item_types',
        'item_units',
        'item_packages',
        'item_dosages',
        'item_manufacturers',
      ];
      const channelName = 'item-master-realtime';

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'items',
            event: '*',
          },
          payload => handleTableChange('items', payload)
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_categories',
            event: '*',
          },
          payload => handleTableChange('item_categories', payload)
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_types',
            event: '*',
          },
          payload => handleTableChange('item_types', payload)
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_units',
            event: '*',
          },
          payload => handleTableChange('item_units', payload)
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_packages',
            event: '*',
          },
          payload => handleTableChange('item_packages', payload)
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_dosages',
            event: '*',
          },
          payload => handleTableChange('item_dosages', payload)
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_manufacturers',
            event: '*',
          },
          payload => handleTableChange('item_manufacturers', payload)
        )
        .subscribe(status => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Item Master realtime connected');
            console.log('🔍 Monitoring:', tables.join(', '));
          } else if (status === 'CHANNEL_ERROR') {
            console.log('🔌 Realtime disconnected');
          }
        });

      globalChannelRef = channel;
    };

    return () => {
      // Clear timeout if component unmounts before timeout completes
      clearTimeout(timeoutId);
      globalSetupRef = false;

      // Proper cleanup
      if (globalChannelRef) {
        try {
          globalChannelRef.unsubscribe();
          supabase.removeChannel(globalChannelRef);
          console.log('🔌 Realtime disconnected');
        } catch {
          // Ignore cleanup errors
        }
        globalChannelRef = null;
      }
    };
  }, [enabled, queryClient]);
};
