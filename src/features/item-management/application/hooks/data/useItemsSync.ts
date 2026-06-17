import { type QueryClient, useQueryClient } from '@tanstack/react-query';
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
let subscriberCount = 0;
let setupTimeoutId: ReturnType<typeof setTimeout> | null = null;
let retryTimeoutId: ReturnType<typeof setTimeout> | null = null;
const ITEM_MASTER_REALTIME_QUERY_KEYS = [
  QueryKeys.items.all,
  QueryKeys.masterData.categories.all,
  QueryKeys.masterData.types.all,
  QueryKeys.masterData.itemUnits.all,
  QueryKeys.masterData.packages.all,
  QueryKeys.masterData.dosages.all,
  QueryKeys.masterData.manufacturers.all,
] as const;

const queryClientSubscribers = new Map<QueryClient, number>();

const addQueryClientSubscriber = (queryClient: QueryClient) => {
  queryClientSubscribers.set(
    queryClient,
    (queryClientSubscribers.get(queryClient) ?? 0) + 1
  );
};

const removeQueryClientSubscriber = (queryClient: QueryClient) => {
  const count = queryClientSubscribers.get(queryClient);
  if (!count) return;

  if (count === 1) {
    queryClientSubscribers.delete(queryClient);
    return;
  }

  queryClientSubscribers.set(queryClient, count - 1);
};

const invalidateActiveQueryClients = () => {
  queryClientSubscribers.forEach((_count, queryClient) => {
    void invalidateQueryKeys(queryClient, ITEM_MASTER_REALTIME_QUERY_KEYS);
  });
};

export const useItemsSync = ({ enabled = true }: ItemsSyncOptions = {}) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    subscriberCount += 1;
    addQueryClientSubscriber(queryClient);

    const setupRealtimeConnection = () => {
      if (subscriberCount === 0 || globalChannelRef) {
        return;
      }

      const channel = itemRealtimeService
        .createChannel('item-master-realtime')
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'items',
            event: '*',
          },
          invalidateActiveQueryClients
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_categories',
            event: '*',
          },
          invalidateActiveQueryClients
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_types',
            event: '*',
          },
          invalidateActiveQueryClients
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_units',
            event: '*',
          },
          invalidateActiveQueryClients
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_packages',
            event: '*',
          },
          invalidateActiveQueryClients
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_dosages',
            event: '*',
          },
          invalidateActiveQueryClients
        )
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'item_manufacturers',
            event: '*',
          },
          invalidateActiveQueryClients
        )
        .subscribe();

      globalChannelRef = channel;
    };

    if (!globalSetupRef) {
      globalSetupRef = true;
      setupTimeoutId = setTimeout(() => {
        setupTimeoutId = null;

        if (navigator.onLine && document.readyState === 'complete') {
          setupRealtimeConnection();
          return;
        }

        retryTimeoutId = setTimeout(() => {
          retryTimeoutId = null;
          setupRealtimeConnection();
        }, 1000);
      }, 2000);
    }

    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1);
      removeQueryClientSubscriber(queryClient);

      if (subscriberCount > 0) {
        return;
      }

      if (setupTimeoutId !== null) {
        clearTimeout(setupTimeoutId);
        setupTimeoutId = null;
      }
      if (retryTimeoutId !== null) {
        clearTimeout(retryTimeoutId);
        retryTimeoutId = null;
      }
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
