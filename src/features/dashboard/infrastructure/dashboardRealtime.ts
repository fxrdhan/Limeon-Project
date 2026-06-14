import type { RealtimeChannel } from '@supabase/supabase-js';
import { realtimeService } from '@/services/realtime/realtime.service';

export type DashboardRealtimeChannel = RealtimeChannel;

export const createDashboardRealtimeChannel = (onChange: () => void) =>
  realtimeService
    .createChannel('dashboard-realtime')
    .on(
      'postgres_changes',
      {
        schema: 'public',
        table: 'sales',
        event: '*',
      },
      onChange
    )
    .on(
      'postgres_changes',
      {
        schema: 'public',
        table: 'sale_items',
        event: '*',
      },
      onChange
    )
    .on(
      'postgres_changes',
      {
        schema: 'public',
        table: 'purchases',
        event: '*',
      },
      onChange
    )
    .on(
      'postgres_changes',
      {
        schema: 'public',
        table: 'purchase_items',
        event: '*',
      },
      onChange
    )
    .on(
      'postgres_changes',
      {
        schema: 'public',
        table: 'items',
        event: '*',
      },
      onChange
    )
    .subscribe();

export const removeDashboardRealtimeChannel = (
  channel: DashboardRealtimeChannel
) => realtimeService.removeChannel(channel);
