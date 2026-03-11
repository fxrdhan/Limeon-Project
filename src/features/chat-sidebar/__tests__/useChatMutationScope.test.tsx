import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useChatMutationScope } from '../hooks/useChatMutationScope';
import type { ChatMessage } from '../../../services/api/chat.service';

const { mockIsConversationScopeActive, mockReconcileMessagesFromServer } =
  vi.hoisted(() => ({
    mockIsConversationScopeActive: vi.fn(),
    mockReconcileMessagesFromServer: vi.fn(),
  }));

vi.mock('../hooks/useActiveConversationScope', () => ({
  useActiveConversationScope: () => ({
    isConversationScopeActive: mockIsConversationScopeActive,
  }),
}));

vi.mock('../hooks/useChatConversationReconciler', () => ({
  useChatConversationReconciler: () => mockReconcileMessagesFromServer,
}));

describe('useChatMutationScope', () => {
  it('runs effects only for the active current conversation scope', () => {
    mockIsConversationScopeActive.mockImplementation(
      (scopeKey: string | null) => scopeKey === 'user-a::user-b::channel-1'
    );

    const scopedEffect = vi.fn();

    const { result } = renderHook(() =>
      useChatMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        messages: [],
        setMessages: vi.fn(),
      })
    );

    expect(result.current.isCurrentConversationScopeActive()).toBe(true);
    expect(result.current.runInCurrentConversationScope(scopedEffect)).toBe(
      true
    );
    expect(scopedEffect).toHaveBeenCalledOnce();
  });

  it('forwards the current scope key into reconciliation helpers', async () => {
    mockIsConversationScopeActive.mockReturnValue(true);
    mockReconcileMessagesFromServer.mockResolvedValue(undefined);

    const fallbackMessages: ChatMessage[] = [
      {
        id: 'message-1',
        sender_id: 'user-a',
        receiver_id: 'user-b',
        channel_id: 'channel-1',
        message: 'halo',
        message_type: 'text',
        created_at: '2026-03-08T12:00:00.000Z',
        updated_at: '2026-03-08T12:00:00.000Z',
        is_read: false,
        is_delivered: false,
        reply_to_id: null,
      },
    ];

    const { result } = renderHook(() =>
      useChatMutationScope({
        user: { id: 'user-a', name: 'Admin' },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
          profilephoto: null,
        },
        currentChannelId: 'channel-1',
        messages: [],
        setMessages: vi.fn(),
      })
    );

    await result.current.reconcileCurrentConversationMessages({
      fallbackMessages,
    });

    expect(mockReconcileMessagesFromServer).toHaveBeenCalledWith({
      conversationScopeKey: 'user-a::user-b::channel-1',
      fallbackMessages,
    });
  });
});
