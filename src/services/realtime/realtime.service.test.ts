import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { realtimeService } from './realtime.service';

const { mockRealtimeClient, mockSupabase } = vi.hoisted(() => {
  const mockRealtimeClient = {
    channels: [] as RealtimeChannel[],
    _remove: vi.fn(),
    disconnect: vi.fn(),
  };

  const mockSupabase = {
    realtime: mockRealtimeClient,
    channel: vi.fn(),
    getChannels: vi.fn(() => mockRealtimeClient.channels),
  };

  return { mockRealtimeClient, mockSupabase };
});

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('realtimeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRealtimeClient.channels = [];
    delete (
      mockRealtimeClient as typeof mockRealtimeClient & {
        __pharmaSysRemoveChannelPatch?: true;
      }
    ).__pharmaSysRemoveChannelPatch;
  });

  it('detaches only the removed channel instance before waiting for the leave acknowledgement', async () => {
    let acknowledgeLeave: (status: 'ok') => void = () => {};
    const leaveAcknowledgement = new Promise<'ok'>(resolve => {
      acknowledgeLeave = resolve;
    });
    const staleChannelUnsubscribe = vi.fn(() => leaveAcknowledgement);
    const staleChannelTeardown = vi.fn();
    const replacementChannelUnsubscribe = vi.fn();
    const replacementChannelTeardown = vi.fn();
    const staleChannel = {
      topic: 'realtime:chat_channel-a',
      unsubscribe: staleChannelUnsubscribe,
      teardown: staleChannelTeardown,
    } as unknown as RealtimeChannel;
    const replacementChannel = {
      topic: 'realtime:chat_channel-a',
      unsubscribe: replacementChannelUnsubscribe,
      teardown: replacementChannelTeardown,
    } as unknown as RealtimeChannel;
    mockRealtimeClient.channels = [staleChannel, replacementChannel];

    const removal = realtimeService.removeChannel(staleChannel);

    expect(mockRealtimeClient.channels).toEqual([replacementChannel]);
    expect(staleChannelUnsubscribe).toHaveBeenCalledTimes(1);
    expect(staleChannelTeardown).not.toHaveBeenCalled();
    expect(replacementChannelUnsubscribe).not.toHaveBeenCalled();
    expect(replacementChannelTeardown).not.toHaveBeenCalled();

    acknowledgeLeave('ok');
    await expect(removal).resolves.toBe('ok');

    expect(staleChannelTeardown).toHaveBeenCalledTimes(1);
    expect(mockRealtimeClient.disconnect).not.toHaveBeenCalled();
  });
});
