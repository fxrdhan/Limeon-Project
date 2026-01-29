import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { realtimeService } from '@/services/realtime/realtime.service';
import { QueryKeys } from '@/constants/queryKeys';

interface ItemsSyncOptions {
  enabled?: boolean;
}

/**
 * Realtime sync for items and related master data
 * Listens to changes and invalidates queries automatically
 */
// Global ref to prevent multiple instances across all hook instances
let globalSetupRef = false;
let globalChannelRef: RealtimeChannel | null = null;

export const useItemsSync = ({ enabled = true }: ItemsSyncOptions = {}) => {
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
        setupRealtimeConnection();
      } else {
        // Retry after another second
        setTimeout(() => {
          setupRealtimeConnection();
        }, 1000);
      }
    }, 2000); // 2 second delay

    const setupRealtimeConnection = () => {
      const handleTableChange = (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _tableName: string,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _payload: {
          eventType: string;
          new?: Record<string, unknown>;
          old?: Record<string, unknown>;
          commit_timestamp?: string;
        }
      ) => {
        // Invalidate all item master queries
        queryClient.invalidateQueries({ queryKey: QueryKeys.items.all });
        queryClient.invalidateQueries({
          queryKey: QueryKeys.masterData.categories.all,
        });
        queryClient.invalidateQueries({
          queryKey: QueryKeys.masterData.types.all,
        });
        queryClient.invalidateQueries({
          queryKey: QueryKeys.masterData.itemUnits.all,
        });
        queryClient.invalidateQueries({
          queryKey: QueryKeys.masterData.packages.all,
        });
        queryClient.invalidateQueries({
          queryKey: QueryKeys.masterData.dosages.all,
        });
        queryClient.invalidateQueries({
          queryKey: QueryKeys.masterData.manufacturers.all,
        });
      };

      // All item master tables
      // const tables = [
      //   'items',
      //   'item_categories',
      //   'item_types',
      //   'item_units',
      //   'item_packages',
      //   'item_dosages',
      //   'item_manufacturers',
      // ];
      const channelName = 'item-master-realtime';

      const channel = realtimeService
        .createChannel(channelName)
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
            // Connected
          } else if (status === 'CHANNEL_ERROR') {
            // Error
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
          realtimeService.removeChannel(globalChannelRef);
        } catch {
          // Ignore cleanup errors
        }
        globalChannelRef = null;
      }
    };
  }, [queryClient, enabled]);
};

// Backward compatibility alias
export const useItemMasterRealtime = useItemsSync;
