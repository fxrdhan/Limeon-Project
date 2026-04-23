import { supabase } from "@/lib/supabase";
import type { RealtimeChannel, RealtimeChannelOptions } from "@supabase/supabase-js";

const getRealtimeTopic = (name: string) => `realtime:${name}`;

type InternalRealtimeClient = typeof supabase.realtime & {
  _remove: (channel: RealtimeChannel) => void;
};

export const realtimeService = {
  createChannel(name: string, options?: RealtimeChannelOptions): RealtimeChannel {
    return supabase.channel(name, options);
  },
  async replaceChannel(name: string, options?: RealtimeChannelOptions): Promise<RealtimeChannel> {
    await this.removeChannelsByName(name);
    return this.createChannel(name, options);
  },
  async removeChannel(channel: RealtimeChannel) {
    const realtimeClient = supabase.realtime as InternalRealtimeClient;
    const status = await channel.unsubscribe();

    // Force local cleanup even when Supabase returns timeout/error so
    // the topic does not stay registered during StrictMode/HMR reruns.
    channel.teardown();
    realtimeClient._remove(channel);

    if (supabase.getChannels().length === 0) {
      void realtimeClient.disconnect();
    }

    return status;
  },
  async removeChannelsByName(name: string) {
    const channels = supabase
      .getChannels()
      .filter((channel) => channel.topic === getRealtimeTopic(name));

    for (const channel of channels) {
      await this.removeChannel(channel);
    }
  },
};
