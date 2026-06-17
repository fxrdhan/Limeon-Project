import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getInvalidationKeys } from '@/constants/queryKeys';
import { invalidateQueryKeys } from '@/lib/queryInvalidation';
import {
  itemRealtimeService,
  type RealtimeChannel,
} from '../../../infrastructure/itemRealtime.service';

interface SuppliersSyncOptions {
  enabled?: boolean;
}

let globalChannelRef: RealtimeChannel | null = null;
let subscriberCount = 0;
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
    void invalidateQueryKeys(
      queryClient,
      getInvalidationKeys.masterData.suppliers()
    );
  });
};

export const useSuppliersSync = ({
  enabled = true,
}: SuppliersSyncOptions = {}) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    subscriberCount += 1;
    addQueryClientSubscriber(queryClient);

    if (!globalChannelRef) {
      const channel = itemRealtimeService
        .createChannel('suppliers-realtime')
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'suppliers',
            event: '*',
          },
          invalidateActiveQueryClients
        )
        .subscribe();

      globalChannelRef = channel;
    }

    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1);
      removeQueryClientSubscriber(queryClient);
      if (subscriberCount > 0) return;

      if (globalChannelRef) {
        void globalChannelRef.unsubscribe();
        void itemRealtimeService.removeChannel(globalChannelRef);
        globalChannelRef = null;
      }
    };
  }, [enabled, queryClient]);
};
