import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { QueryKeys } from '@/constants/queryKeys';
import { realtimeService } from '@/services/realtime/realtime.service';

interface DashboardRealtimeOptions {
  enabled?: boolean;
}

const DASHBOARD_REALTIME_DEBOUNCE_MS = 350;

export const useDashboardRealtime = ({
  enabled = true,
}: DashboardRealtimeOptions = {}) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null;
        void queryClient.invalidateQueries({
          queryKey: QueryKeys.dashboard.all,
        });
      }, DASHBOARD_REALTIME_DEBOUNCE_MS);
    };

    const channel = realtimeService
      .createChannel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'sales',
          event: '*',
        },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'sale_items',
          event: '*',
        },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'purchases',
          event: '*',
        },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'purchase_items',
          event: '*',
        },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'items',
          event: '*',
        },
        scheduleRefresh
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      if (!channelRef.current) {
        return;
      }

      void channelRef.current.unsubscribe();
      void realtimeService.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [enabled, queryClient]);
};
