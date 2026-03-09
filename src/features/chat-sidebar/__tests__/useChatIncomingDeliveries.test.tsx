import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useChatIncomingDeliveries } from '../hooks/useChatIncomingDeliveries';

const { createdChannels, mockGateway } = vi.hoisted(() => ({
  createdChannels: [] as Array<{
    emitStatus: (status: string) => void;
    on: ReturnType<typeof vi.fn>;
    subscribe: ReturnType<typeof vi.fn>;
  }>,
  mockGateway: {
    createRealtimeChannel: vi.fn(),
    removeRealtimeChannel: vi.fn(),
    listUndeliveredIncomingMessageIds: vi.fn(),
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
  let statusHandler: ((status: string) => void) | null = null;
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
    emitStatus: (status: string) => {
      statusHandler?.(status);
    },
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
    mockGateway.listUndeliveredIncomingMessageIds.mockResolvedValue({
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

  it('backfills undelivered incoming messages when the subscription becomes ready', async () => {
    mockGateway.listUndeliveredIncomingMessageIds.mockResolvedValue({
      data: ['message-legacy-1', 'message-legacy-2'],
      error: null,
    });

    renderHook(() => useChatIncomingDeliveries());

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(mockGateway.listUndeliveredIncomingMessageIds).toHaveBeenCalledWith(
      'user-a'
    );
    expect(mockGateway.markMessageIdsAsDelivered).toHaveBeenCalledWith([
      'message-legacy-1',
      'message-legacy-2',
    ]);
  });

  it('reconnects the delivery channel after a channel error', async () => {
    renderHook(() => useChatIncomingDeliveries());

    expect(mockGateway.createRealtimeChannel).toHaveBeenCalledTimes(1);

    await act(async () => {
      createdChannels[0]?.emitStatus('CHANNEL_ERROR');
      vi.advanceTimersByTime(800);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockGateway.createRealtimeChannel).toHaveBeenCalledTimes(2);
    expect(mockGateway.createRealtimeChannel).toHaveBeenLastCalledWith(
      'incoming_messages_user-a'
    );
  });

  it('retries failed delivered flushes instead of dropping the queued ids', async () => {
    mockGateway.markMessageIdsAsDelivered
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'temporary failure' },
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      });

    renderHook(() => useChatIncomingDeliveries());

    const insertListenerCall = createdChannels[0]?.on.mock.calls.find(
      ([type, config]) =>
        type === 'postgres_changes' && config?.event === 'INSERT'
    );
    const insertListener = insertListenerCall?.[2] as
      | ((payload: { new: ChatMessage }) => void)
      | undefined;

    act(() => {
      insertListener?.({
        new: {
          id: 'message-retry-1',
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

    expect(mockGateway.markMessageIdsAsDelivered).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1_200);
      await Promise.resolve();
    });

    expect(mockGateway.markMessageIdsAsDelivered).toHaveBeenCalledTimes(2);
    expect(mockGateway.markMessageIdsAsDelivered).toHaveBeenLastCalledWith([
      'message-retry-1',
    ]);
  });
});
