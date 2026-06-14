import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  extractRealtimeChatMessageId,
  normalizeRealtimeChatMessage,
} from '@/services/api/chat/normalizers';
import { realtimeService } from '@/services/realtime/realtime.service';

export type { RealtimeChannel };

export const chatSidebarRealtimeGateway = {
  createChannel(channelName: string): RealtimeChannel {
    return realtimeService.createChannel(channelName);
  },

  removeChannel(channel: RealtimeChannel) {
    return realtimeService.removeChannel(channel);
  },

  extractRealtimeChatMessageId,
  normalizeRealtimeChatMessage,
};
