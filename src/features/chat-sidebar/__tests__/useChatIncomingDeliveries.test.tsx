import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useChatIncomingDeliveries } from '../hooks/useChatIncomingDeliveries';

const { createdChannels, mockGateway, mockRealtimeService } = vi.hoisted(
  () => ({
    createdChannels: [] as Array<{
      emitStatus: (status: string) => void;
      on: ReturnType<typeof vi.fn>;
      subscribe: ReturnType<typeof vi.fn>;
    }>,
    mockGateway: {
      listUndeliveredIncomingMessageIds: vi.fn(),
      markMessageIdsAsDelivered: vi.fn(),
    },
    mockRealtimeService: {
      createChannel: vi.fn(),
      removeChannel: vi.fn(),
    },
  })
);

vi.mock('@/store/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'user-a',
      name: 'Admin',
    },
  }),
}));

vi.mock('@/services/api/chat.service', () => ({
  chatMessagesService: mockGateway,
}));

vi.mock('@/services/realtime/realtime.service', () => ({
  realtimeService: mockRealtimeService,
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
      data: {
        messageIds: [],
        hasMore: false,
      },
      error: null,
    });
    mockRealtimeService.removeChannel.mockResolvedValue(undefined);
    mockRealtimeService.createChannel.mockImplementation(() => {
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

    expect(mockRealtimeService.createChannel).toHaveBeenCalledWith(
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
      data: {
        messageIds: ['message-legacy-1', 'message-legacy-2'],
        hasMore: false,
      },
      error: null,
    });

    renderHook(() => useChatIncomingDeliveries());

    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(mockGateway.listUndeliveredIncomingMessageIds).toHaveBeenCalledWith({
      limit: 200,
      offset: 0,
    });
    expect(mockGateway.markMessageIdsAsDelivered).toHaveBeenCalledWith([
      'message-legacy-1',
      'message-legacy-2',
    ]);
  });

  it('chunks large backfills instead of flushing every undelivered id in one mutation', async () => {
    const legacyMessageIds = Array.from(
      { length: 205 },
      (_, index) => `message-legacy-${index + 1}`
    );
    mockGateway.listUndeliveredIncomingMessageIds
      .mockResolvedValueOnce({
        data: {
          messageIds: legacyMessageIds.slice(0, 200),
          hasMore: true,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          messageIds: legacyMessageIds.slice(200),
          hasMore: false,
        },
        error: null,
      });

    renderHook(() => useChatIncomingDeliveries());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(mockGateway.markMessageIdsAsDelivered).toHaveBeenCalledTimes(1);
    expect(
      mockGateway.markMessageIdsAsDelivered.mock.calls[0]?.[0]
    ).toHaveLength(200);

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(mockGateway.markMessageIdsAsDelivered).toHaveBeenCalledTimes(2);
    expect(mockGateway.markMessageIdsAsDelivered.mock.calls[1]?.[0]).toEqual(
      legacyMessageIds.slice(200)
    );
  });

  it('retries failed undelivered backfills without waiting for a channel reconnect', async () => {
    mockGateway.listUndeliveredIncomingMessageIds
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'temporary failure' },
      })
      .mockResolvedValueOnce({
        data: {
          messageIds: ['message-legacy-retry'],
          hasMore: false,
        },
        error: null,
      });

    renderHook(() => useChatIncomingDeliveries());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockGateway.listUndeliveredIncomingMessageIds).toHaveBeenCalledTimes(
      1
    );
    expect(mockRealtimeService.createChannel).toHaveBeenCalledTimes(1);
    expect(mockGateway.markMessageIdsAsDelivered).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1_200);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockGateway.listUndeliveredIncomingMessageIds).toHaveBeenCalledTimes(
      2
    );
    expect(mockRealtimeService.createChannel).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    });

    expect(mockGateway.markMessageIdsAsDelivered).toHaveBeenCalledWith([
      'message-legacy-retry',
    ]);
  });

  it('reconnects the delivery channel after a channel error', async () => {
    renderHook(() => useChatIncomingDeliveries());

    expect(mockRealtimeService.createChannel).toHaveBeenCalledTimes(1);

    await act(async () => {
      createdChannels[0]?.emitStatus('CHANNEL_ERROR');
      vi.advanceTimersByTime(800);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockRealtimeService.createChannel).toHaveBeenCalledTimes(2);
    expect(mockRealtimeService.createChannel).toHaveBeenLastCalledWith(
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
