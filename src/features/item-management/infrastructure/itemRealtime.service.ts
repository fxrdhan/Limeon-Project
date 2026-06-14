import type { RealtimeChannel } from '@supabase/supabase-js';
import { realtimeService } from '@/services/realtime/realtime.service';

export type { RealtimeChannel };

export const itemRealtimeService = {
  createChannel(channelName: string): RealtimeChannel {
    return realtimeService.createChannel(channelName);
  },

  removeChannel(channel: RealtimeChannel) {
    return realtimeService.removeChannel(channel);
  },
};
