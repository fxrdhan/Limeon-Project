import { supabase } from '@/lib/supabase';
import type {
  RealtimeChannel,
  RealtimeChannelOptions,
} from '@supabase/supabase-js';

export const realtimeService = {
  createChannel(
    name: string,
    options?: RealtimeChannelOptions
  ): RealtimeChannel {
    return supabase.channel(name, options);
  },
  removeChannel(channel: RealtimeChannel) {
    return supabase.removeChannel(channel);
  },
};
