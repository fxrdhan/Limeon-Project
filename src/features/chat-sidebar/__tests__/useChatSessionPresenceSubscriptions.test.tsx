import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatSessionPresenceSubscriptions } from '../hooks/useChatSessionPresenceSubscriptions';

const { createdChannels, mockGateway } = vi.hoisted(() => ({
  createdChannels: [] as Array<{
    emitStatus: (status: string) => void;
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  }>,
  mockGateway: {
    createRealtimeChannel: vi.fn(),
    removeRealtimeChannel: vi.fn(),
    getUserPresence: vi.fn(),
  },
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarGateway: mockGateway,
}));

const buildMockChannel = () => {
  let statusHandler: ((status: string) => void) | null = null;
  const channel = {
    emitStatus: (status: string) => {
      statusHandler?.(status);
    },
    on: vi.fn(),
    subscribe: vi.fn(),
  };

  channel.on.mockReturnValue(channel);
  channel.subscribe.mockImplementation(
    (callback?: (status: string) => void) => {
      statusHandler = callback ?? null;
      callback?.('SUBSCRIBED');
      return channel;
    }
  );

  return channel;
};

const currentUser = {
  id: 'user-a',
  name: 'Admin',
  email: 'admin@example.com',
  profilephoto: null,
  role: 'admin',
};

const targetUser = {
  id: 'user-b',
  name: 'Gudang',
  email: 'gudang@example.com',
  profilephoto: null,
};

describe('useChatSessionPresenceSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    createdChannels.length = 0;

    mockGateway.getUserPresence.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    });
    mockGateway.removeRealtimeChannel.mockResolvedValue(undefined);
    mockGateway.createRealtimeChannel.mockImplementation(() => {
      const channel = buildMockChannel();
      createdChannels.push(channel);
      return channel;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reconnects the presence channel after a channel error', async () => {
    renderHook(() => {
      const [presence, setPresence] = useState<{
        user_id: string;
        is_online: boolean;
        last_seen: string;
        updated_at?: string | null;
      } | null>(null);
      const [error, setError] = useState<string | null>(null);

      useChatSessionPresenceSubscriptions({
        isOpen: true,
        user: currentUser,
        targetUser,
        currentChannelId: 'channel-1',
        setTargetUserPresence: setPresence,
        setTargetUserPresenceError: setError,
      });

      return {
        presence,
        error,
      };
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGateway.createRealtimeChannel).toHaveBeenCalledTimes(1);

    await act(async () => {
      createdChannels[0]?.emitStatus('CHANNEL_ERROR');
      vi.advanceTimersByTime(800);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockGateway.createRealtimeChannel).toHaveBeenCalledTimes(2);
  });
});
