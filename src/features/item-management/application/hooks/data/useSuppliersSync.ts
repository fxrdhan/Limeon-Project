import { useQueryClient } from '@tanstack/react-query';
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

export const useSuppliersSync = ({
  enabled = true,
}: SuppliersSyncOptions = {}) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    subscriberCount += 1;

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
          () => {
            void invalidateQueryKeys(
              queryClient,
              getInvalidationKeys.masterData.suppliers()
            );
          }
        )
        .subscribe();

      globalChannelRef = channel;
    }

    return () => {
      subscriberCount = Math.max(0, subscriberCount - 1);
      if (subscriberCount > 0) return;

      if (globalChannelRef) {
        void globalChannelRef.unsubscribe();
        void itemRealtimeService.removeChannel(globalChannelRef);
        globalChannelRef = null;
      }
    };
  }, [enabled, queryClient]);
};
