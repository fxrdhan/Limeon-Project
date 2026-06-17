import { act, renderHook } from '@testing-library/react';
import { useEffect, useState } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
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

  it('cancels pending restore focus after switching conversations', async () => {
    const pendingUpdate = createDeferred<{
      data: null;
      error: Error;
    }>();
    mockChatSidebarMessagesGateway.editTextMessage.mockReturnValue(
      pendingUpdate.promise
    );

    const queuedFrames = new Map<number, FrameRequestCallback>();
    let nextFrameId = 1;
    const originalRequestAnimationFrame = window.requestAnimationFrame;
    const originalCancelAnimationFrame = window.cancelAnimationFrame;
    const cancelAnimationFrameMock = vi.fn((frameId: number) => {
      queuedFrames.delete(frameId);
    });
    vi.stubGlobal('requestAnimationFrame', ((
      callback: FrameRequestCallback
    ) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      queuedFrames.set(frameId, callback);
      return frameId;
    }) as typeof requestAnimationFrame);
    vi.stubGlobal(
      'cancelAnimationFrame',
      cancelAnimationFrameMock as typeof cancelAnimationFrame
    );

    const flushQueuedFrames = () => {
      const frames = Array.from(queuedFrames.entries());
      queuedFrames.clear();

      for (const [frameId, callback] of frames) {
        callback(frameId);
      }
    };

    try {
      const closeMessageMenu = vi.fn();
      const focusMessageComposer = vi.fn();

      const buildStateMessage = ({
        channelId,
        messageId,
        receiverId,
        receiverName,
      }: {
        channelId: string;
        messageId: string;
        receiverId: string;
        receiverName: string;
      }) => ({
        id: messageId,
        sender_id: 'user-a',
        receiver_id: receiverId,
        channel_id: channelId,
        message: 'initial message',
        message_type: 'text' as const,
        created_at: '2026-03-11T00:00:00.000Z',
        updated_at: '2026-03-11T00:00:00.000Z',
        is_read: false,
        is_delivered: false,
        reply_to_id: null,
        sender_name: 'Admin',
        receiver_name: receiverName,
        stableKey: `stable-${messageId}`,
      });

      type HookProps = {
        channelId: string;
        messageId: string;
        targetUserId: string;
        targetUserName: string;
      };

      const { result, rerender } = renderHook(
        (props: HookProps) => {
          const [messages, setMessages] = useState(() => [
            buildStateMessage({
              channelId: props.channelId,
              messageId: props.messageId,
              receiverId: props.targetUserId,
              receiverName: props.targetUserName,
            }),
          ]);
          const [message, setMessage] = useState('edited message');
          const [editingMessageId, setEditingMessageId] = useState<
            string | null
          >(props.messageId);

          useEffect(() => {
            setMessages([
              buildStateMessage({
                channelId: props.channelId,
                messageId: props.messageId,
                receiverId: props.targetUserId,
                receiverName: props.targetUserName,
              }),
            ]);
            setMessage('edited message');
            setEditingMessageId(props.messageId);
          }, [
            props.channelId,
            props.messageId,
            props.targetUserId,
            props.targetUserName,
          ]);

          const action = useChatMessageUpdateAction({
            user: {
              id: 'user-a',
              name: 'Admin',
            },
            targetUser: {
              id: props.targetUserId,
              name: props.targetUserName,
              email: `${props.targetUserId}@example.com`,
            },
            currentChannelId: props.channelId,
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
            editingMessageId,
            message,
          };
        },
        {
          initialProps: {
            channelId: 'channel-1',
            messageId: 'message-1',
            targetUserId: 'user-b',
            targetUserName: 'Gudang',
          },
        }
      );

      await act(async () => {
        void result.current.handleUpdateMessage();
        await Promise.resolve();
      });

      await act(async () => {
        pendingUpdate.resolve({
          data: null,
          error: new Error('Forbidden'),
        });
        await Promise.resolve();
        await Promise.resolve();
      });

      const restoreFocusFrameId = nextFrameId - 1;
      expect(result.current.editingMessageId).toBe('message-1');
      expect(result.current.message).toBe('edited message');
      expect(queuedFrames.has(restoreFocusFrameId)).toBe(true);

      act(() => {
        rerender({
          channelId: 'channel-2',
          messageId: 'message-2',
          targetUserId: 'user-c',
          targetUserName: 'Kasir',
        });
      });

      expect(cancelAnimationFrameMock).toHaveBeenCalledWith(
        restoreFocusFrameId
      );

      act(() => {
        flushQueuedFrames();
      });

      expect(focusMessageComposer).not.toHaveBeenCalled();
    } finally {
      vi.stubGlobal('requestAnimationFrame', originalRequestAnimationFrame);
      vi.stubGlobal('cancelAnimationFrame', originalCancelAnimationFrame);
    }
  });
});
