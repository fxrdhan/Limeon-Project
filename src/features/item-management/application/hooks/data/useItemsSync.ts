import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { QueryKeys } from '@/constants/queryKeys';
import { invalidateQueryKeys } from '@/lib/queryInvalidation';
import {
  itemRealtimeService,
  type RealtimeChannel,
} from '../../../infrastructure/itemRealtime.service';

interface ItemsSyncOptions {
  enabled?: boolean;
}

/**
 * Realtime sync for items and related master data
 * Listens to changes and invalidates queries automatically
 */
let globalSetupRef = false;
let globalChannelRef: RealtimeChannel | null = null;
const ITEM_MASTER_REALTIME_QUERY_KEYS = [
  QueryKeys.items.all,
  QueryKeys.masterData.categories.all,
  QueryKeys.masterData.types.all,
  QueryKeys.masterData.itemUnits.all,
  QueryKeys.masterData.packages.all,
  QueryKeys.masterData.dosages.all,
  QueryKeys.masterData.manufacturers.all,
] as const;

export const useItemsSync = ({ enabled = true }: ItemsSyncOptions = {}) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || globalSetupRef) {
      return;
    }

    globalSetupRef = true;

    const timeoutId = setTimeout(() => {
      if (navigator.onLine && document.readyState === 'complete') {
        setupRealtimeConnection();
      } else {
        setTimeout(() => {
          setupRealtimeConnection();
        }, 1000);
      }
    }, 2000);

    const setupRealtimeConnection = () => {
      const handleTableChange = () => {
        void invalidateQueryKeys(queryClient, ITEM_MASTER_REALTIME_QUERY_KEYS);
      };

      const channel = itemRealtimeService
        .createChannel('item-master-realtime')
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'items',
            event: '*',
          },
          handleTableChange
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_categories',
            event: '*',
          },
          handleTableChange
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_types',
            event: '*',
          },
          handleTableChange
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_units',
            event: '*',
          },
          handleTableChange
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_packages',
            event: '*',
          },
          handleTableChange
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_dosages',
            event: '*',
          },
          handleTableChange
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_manufacturers',
            event: '*',
          },
          handleTableChange
        )
        .subscribe();

      globalChannelRef = channel;
    };

    return () => {
      clearTimeout(timeoutId);
      globalSetupRef = false;

      if (globalChannelRef) {
        try {
          void globalChannelRef.unsubscribe();
          void itemRealtimeService.removeChannel(globalChannelRef);
        } catch {
          // Ignore cleanup errors
        }
        globalChannelRef = null;
      }
    };
  }, [queryClient, enabled]);
};
