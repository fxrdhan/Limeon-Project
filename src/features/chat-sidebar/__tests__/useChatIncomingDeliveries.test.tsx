import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useChatIncomingDeliveries } from '../hooks/useChatIncomingDeliveries';

const { createdChannels, mockGateway } = vi.hoisted(() => ({
  createdChannels: [] as Array<{
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  }>,
  mockGateway: {
    createRealtimeChannel: vi.fn(),
    removeRealtimeChannel: vi.fn(),
    markMessageIdsAsDelivered: vi.fn(),
  },
}));

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-a',
      name: 'Admin',
    },
  }),
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarGateway: mockGateway,
}));

const buildMockChannel = () => {
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };

  channel.on.mockReturnValue(channel);
  channel.subscribe.mockImplementation(
    (callback?: (status: string) => void) => {
      callback?.('SUBSCRIBED');
      return channel;
    }
  );

  return channel;
};

describe('useChatIncomingDeliveries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    createdChannels.length = 0;

    mockGateway.markMessageIdsAsDelivered.mockResolvedValue({
      data: [],
      error: null,
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

  it('marks incoming inserts as delivered without relying on sidebar open state', async () => {
    renderHook(() => useChatIncomingDeliveries());

    expect(mockGateway.createRealtimeChannel).toHaveBeenCalledWith(
      'incoming_messages_user-a'
    );

    const insertListenerCall = createdChannels[0]?.on.mock.calls.find(
      ([type, config]) =>
        type === 'postgres_changes' && config?.event === 'INSERT'
    );
    expect(insertListenerCall).toBeDefined();

    const insertListener = insertListenerCall?.[2] as
      | ((payload: { new: ChatMessage }) => void)
      | undefined;

    act(() => {
      insertListener?.({
        new: {
          id: 'message-1',
          sender_id: 'user-b',
          receiver_id: 'user-a',
          channel_id: 'channel-1',
          message: 'stok datang',
          message_type: 'text',
          created_at: '2026-03-07T10:00:00.000Z',
          updated_at: '2026-03-07T10:00:00.000Z',
          is_read: false,
          is_delivered: false,
          reply_to_id: null,
        },
      });
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(mockGateway.markMessageIdsAsDelivered).toHaveBeenCalledWith([
      'message-1',
    ]);
  });
});
