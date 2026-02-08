import { beforeEach, describe, expect, it, vi } from 'vitest';

const channelMock = vi.hoisted(() => vi.fn());
const removeChannelMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: channelMock,
    removeChannel: removeChannelMock,
  },
}));

describe('realtimeService', () => {
  beforeEach(() => {
    channelMock.mockReset();
    removeChannelMock.mockReset();
  });

  it('creates channel with options', async () => {
    const { realtimeService } = await import('./realtime.service');
    const mockChannel = { id: 'ch-1' };
    channelMock.mockReturnValueOnce(mockChannel);

    const result = realtimeService.createChannel('presence-room', {
      config: { private: true },
    });

    expect(channelMock).toHaveBeenCalledWith('presence-room', {
      config: { private: true },
    });
    expect(result).toBe(mockChannel);
  });

  it('removes channel', async () => {
    const { realtimeService } = await import('./realtime.service');
    const channel = { id: 'ch-2' } as never;

    realtimeService.removeChannel(channel);

    expect(removeChannelMock).toHaveBeenCalledWith(channel);
  });
});
