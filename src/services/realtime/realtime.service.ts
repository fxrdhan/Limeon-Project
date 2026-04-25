import { supabase } from '@/lib/supabase';
import type {
  RealtimeChannel,
  RealtimeChannelOptions,
} from '@supabase/supabase-js';

const getRealtimeTopic = (name: string) => `realtime:${name}`;

type InternalRealtimeClient = typeof supabase.realtime & {
  channels: RealtimeChannel[];
  _remove: (channel: RealtimeChannel) => void;
  __pharmaSysRemoveChannelPatch?: true;
};

const getRealtimeClient = (): InternalRealtimeClient => {
  const realtimeClient = supabase.realtime as InternalRealtimeClient;

  if (!realtimeClient.__pharmaSysRemoveChannelPatch) {
    realtimeClient._remove = (channel: RealtimeChannel) => {
      realtimeClient.channels = realtimeClient.channels.filter(
        currentChannel => currentChannel !== channel
      );
    };
    realtimeClient.__pharmaSysRemoveChannelPatch = true;
  }

  return realtimeClient;
};

export const realtimeService = {
  createChannel(
    name: string,
    options?: RealtimeChannelOptions
  ): RealtimeChannel {
    return supabase.channel(name, options);
  },
  async replaceChannel(
    name: string,
    options?: RealtimeChannelOptions
  ): Promise<RealtimeChannel> {
    await this.removeChannelsByName(name);
    return this.createChannel(name, options);
  },
  async removeChannel(channel: RealtimeChannel) {
    const realtimeClient = getRealtimeClient();

    // Detach locally before awaiting the server leave ack. In React dev
    // StrictMode, the replacement channel can be created immediately after
    // cleanup starts, and Supabase reuses registered topics synchronously.
    realtimeClient._remove(channel);
    let status: 'ok' | 'timed out' | 'error' = 'ok';

    try {
      status = await channel.unsubscribe();
    } catch {
      status = 'error';
    } finally {
      channel.teardown();
    }

    if (supabase.getChannels().length === 0) {
      void realtimeClient.disconnect();
    }

    return status;
  },
  async removeChannelsByName(name: string) {
    const channels = supabase
      .getChannels()
      .filter(channel => channel.topic === getRealtimeTopic(name));

    for (const channel of channels) {
      await this.removeChannel(channel);
    }
  },
};
