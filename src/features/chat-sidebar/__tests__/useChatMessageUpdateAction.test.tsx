import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatMessageUpdateAction } from '../hooks/useChatMessageUpdateAction';

const { mockChatSidebarMessagesGateway, mockToast } = vi.hoisted(() => ({
  mockChatSidebarMessagesGateway: {
    editTextMessage: vi.fn(),
  },
  mockToast: {
    error: vi.fn(),
  },
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarMessagesGateway: mockChatSidebarMessagesGateway,
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    resolve,
    reject,
  };
};

describe('useChatMessageUpdateAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('restores only the edited fields when an update fails after receipts changed', async () => {
    const pendingUpdate = createDeferred<{
      data: null;
      error: Error;
    }>();
    mockChatSidebarMessagesGateway.editTextMessage.mockReturnValue(
      pendingUpdate.promise
    );

    const closeMessageMenu = vi.fn();
    const focusMessageComposer = vi.fn();

    const { result } = renderHook(() => {
      const [messages, setMessages] = useState([
        {
          id: 'message-1',
          sender_id: 'user-a',
          receiver_id: 'user-b',
          channel_id: 'channel-1',
          message: 'initial message',
          message_type: 'text' as const,
          created_at: '2026-03-11T00:00:00.000Z',
          updated_at: '2026-03-11T00:00:00.000Z',
          is_read: false,
          is_delivered: false,
          reply_to_id: null,
          sender_name: 'Admin',
          receiver_name: 'Gudang',
          stableKey: 'stable-message-1',
        },
      ]);
      const [message, setMessage] = useState('edited message');
      const [editingMessageId, setEditingMessageId] = useState<string | null>(
        'message-1'
      );

      const action = useChatMessageUpdateAction({
        user: {
          id: 'user-a',
          name: 'Admin',
        },
        targetUser: {
          id: 'user-b',
          name: 'Gudang',
          email: 'gudang@example.com',
        },
        currentChannelId: 'channel-1',
        messages,
        setMessages,
        message,
        setMessage,
        editingMessageId,
        setEditingMessageId,
        closeMessageMenu,
        focusMessageComposer,
        isCurrentConversationScopeActive: () => true,
        runInCurrentConversationScope: effect => {
          effect();
          return true;
        },
      });

      return {
        ...action,
        messages,
        setMessages,
        message,
        editingMessageId,
      };
    });

    await act(async () => {
      void result.current.handleUpdateMessage();
      await Promise.resolve();
    });

    expect(result.current.messages[0]?.message).toBe('edited message');
    expect(result.current.editingMessageId).toBeNull();
    expect(result.current.message).toBe('');

    act(() => {
      result.current.setMessages(previousMessages =>
        previousMessages.map(messageItem =>
          messageItem.id === 'message-1'
            ? {
                ...messageItem,
                is_delivered: true,
                is_read: true,
              }
            : messageItem
        )
      );
    });

    await act(async () => {
      pendingUpdate.resolve({
        data: null,
        error: new Error('Forbidden'),
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.messages[0]).toMatchObject({
      id: 'message-1',
      message: 'initial message',
      is_delivered: true,
      is_read: true,
    });
    expect(result.current.editingMessageId).toBe('message-1');
    expect(result.current.message).toBe('edited message');
  });
});
