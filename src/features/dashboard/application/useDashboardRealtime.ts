import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { QueryKeys } from '@/constants/queryKeys';
import {
  createDashboardRealtimeChannel,
  removeDashboardRealtimeChannel,
  type DashboardRealtimeChannel,
} from '../infrastructure/dashboardRealtime';

interface DashboardRealtimeOptions {
  enabled?: boolean;
}

const DASHBOARD_REALTIME_DEBOUNCE_MS = 350;

export const useDashboardRealtime = ({
  enabled = true,
}: DashboardRealtimeOptions = {}) => {
  const queryClient = useQueryClient();
  const channelRef = useRef<DashboardRealtimeChannel | null>(null);
  const refreshTimeoutRef = useRef<number | null>(null);
  const subscriptionGenerationRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const subscriptionGeneration = subscriptionGenerationRef.current + 1;
    subscriptionGenerationRef.current = subscriptionGeneration;

    const isCurrentSubscription = () =>
      subscriptionGenerationRef.current === subscriptionGeneration;

    const scheduleRefresh = () => {
      if (!isCurrentSubscription()) {
        return;
      }

      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        if (!isCurrentSubscription()) {
          return;
        }

        refreshTimeoutRef.current = null;
        void queryClient.invalidateQueries({
          queryKey: QueryKeys.dashboard.all,
        });
      }, DASHBOARD_REALTIME_DEBOUNCE_MS);
    };

    const channel = createDashboardRealtimeChannel(scheduleRefresh);

    channelRef.current = channel;

    return () => {
      subscriptionGenerationRef.current += 1;

      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      if (!channelRef.current) {
        return;
      }

      void channelRef.current.unsubscribe();
      void removeDashboardRealtimeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [enabled, queryClient]);
};
