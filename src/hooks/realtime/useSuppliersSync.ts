import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getInvalidationKeys } from '@/constants/queryKeys';
import { realtimeService } from '@/services/realtime/realtime.service';

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
      const channel = realtimeService
        .createChannel('suppliers-realtime')
        .on(
          'postgres_changes',
          {
            schema: 'public',
            table: 'suppliers',
            event: '*',
          },
          () => {
            getInvalidationKeys.masterData.suppliers().forEach(queryKey => {
              void queryClient.invalidateQueries({ queryKey });
            });
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
        void realtimeService.removeChannel(globalChannelRef);
        globalChannelRef = null;
      }
    };
  }, [enabled, queryClient]);
};
