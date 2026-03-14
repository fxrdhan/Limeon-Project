import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ChatMessage } from '../data/chatSidebarGateway';
import { useChatConversationReconciler } from '../hooks/useChatConversationReconciler';

const { mockChatSidebarMessagesGateway } = vi.hoisted(() => ({
  mockChatSidebarMessagesGateway: {
    fetchConversationMessages: vi.fn(),
  },
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarMessagesGateway: mockChatSidebarMessagesGateway,
}));

const buildMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? 'user-a',
  receiver_id: overrides.receiver_id ?? 'user-b',
  channel_id: overrides.channel_id ?? 'channel-1',
  message: overrides.message ?? 'hello',
  message_type: overrides.message_type ?? 'text',
  created_at: overrides.created_at ?? '2026-03-09T09:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-03-09T09:00:00.000Z',
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? false,
  reply_to_id: overrides.reply_to_id ?? null,
  sender_name: overrides.sender_name ?? 'Admin',
  receiver_name: overrides.receiver_name ?? 'Gudang',
  stableKey: overrides.stableKey,
});

describe('useChatConversationReconciler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('pages server history to avoid dropping older loaded persisted messages', async () => {
    mockChatSidebarMessagesGateway.fetchConversationMessages
      .mockResolvedValueOnce({
        data: {
          messages: [
            buildMessage({
              id: 'message-3',
              message: 'latest-1-fresh',
              created_at: '2026-03-09T09:02:00.000Z',
            }),
            buildMessage({
              id: 'message-4',
              message: 'latest-2-fresh',
              created_at: '2026-03-09T09:03:00.000Z',
            }),
          ],
          hasMore: true,
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          messages: [
            buildMessage({
              id: 'message-1',
              message: 'older-1',
              created_at: '2026-03-09T09:00:00.000Z',
            }),
            buildMessage({
              id: 'message-2',
              message: 'older-2',
              created_at: '2026-03-09T09:01:00.000Z',
            }),
          ],
          hasMore: false,
        },
        error: null,
      });

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState<ChatMessage[]>([
        buildMessage({
          id: 'message-1',
          message: 'older-1',
          created_at: '2026-03-09T09:00:00.000Z',
        }),
        buildMessage({
          id: 'message-2',
          message: 'older-2',
          created_at: '2026-03-09T09:01:00.000Z',
        }),
        buildMessage({
          id: 'message-3',
          message: 'latest-1-stale',
          created_at: '2026-03-09T09:02:00.000Z',
        }),
        buildMessage({
          id: 'message-4',
          message: 'latest-2-stale',
          created_at: '2026-03-09T09:03:00.000Z',
        }),
      ]);

      const reconcile = useChatConversationReconciler({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
        },
        currentChannelId: 'channel-1',
        messages,
        setMessages,
        isConversationScopeActive: () => true,
      });

      return {
        messages,
        reconcile,
      };
    });

    await act(async () => {
      await result.current.reconcile({
        conversationScopeKey: 'user-a::user-b::channel-1',
      });
    });

    expect(
      mockChatSidebarMessagesGateway.fetchConversationMessages
    ).toHaveBeenCalledTimes(2);
    expect(
      mockChatSidebarMessagesGateway.fetchConversationMessages
    ).toHaveBeenNthCalledWith(2, 'user-b', {
      beforeCreatedAt: '2026-03-09T09:02:00.000Z',
      beforeId: 'message-3',
      limit: 50,
    });
    expect(result.current.messages.map(message => message.id)).toEqual([
      'message-1',
      'message-2',
      'message-3',
      'message-4',
    ]);
    expect(result.current.messages[2]?.message).toBe('latest-1-fresh');
    expect(result.current.messages[3]?.message).toBe('latest-2-fresh');
  });
});
