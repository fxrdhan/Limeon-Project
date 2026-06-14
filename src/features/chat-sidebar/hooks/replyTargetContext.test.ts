import { describe, expect, it } from 'vite-plus/test';
import type { ChatMessage } from '../data/chatSidebarGateway';
import {
  getOldestReplyTargetContextMessage,
  getReplyTargetContextHasOlderMessages,
  mergeAndOrderReplyTargetContextMessages,
} from './replyTargetContext';

const message = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: overrides.id ?? 'message-1',
  sender_id: 'sender-1',
  receiver_id: 'receiver-1',
  channel_id: 'channel-1',
  message: 'hello',
  message_type: 'text',
  created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
  is_read: false,
  reply_to_id: null,
  ...overrides,
});

describe('reply target context helpers', () => {
  it('infers older context only when the target and older messages exceed the before limit', () => {
    const contextMessages = [
      message({ id: 'older-1', created_at: '2026-01-01T00:00:00.000Z' }),
      message({ id: 'older-2', created_at: '2026-01-01T00:01:00.000Z' }),
      message({ id: 'target', created_at: '2026-01-01T00:02:00.000Z' }),
      message({ id: 'newer', created_at: '2026-01-01T00:03:00.000Z' }),
    ];

    expect(
      getReplyTargetContextHasOlderMessages('target', contextMessages, 2)
    ).toBe(true);
    expect(
      getReplyTargetContextHasOlderMessages('target', contextMessages, 3)
    ).toBe(false);
    expect(
      getReplyTargetContextHasOlderMessages('missing', contextMessages, 2)
    ).toBeUndefined();
  });

  it('orders same-timestamp reply context messages by id when finding the oldest message', () => {
    const oldestMessage = message({
      id: 'message-a',
      created_at: '2026-01-01T00:00:00.000Z',
    });

    expect(
      getOldestReplyTargetContextMessage([
        message({ id: 'message-c', created_at: oldestMessage.created_at }),
        oldestMessage,
        message({
          id: 'message-b',
          created_at: '2026-01-01T00:01:00.000Z',
        }),
      ])
    ).toBe(oldestMessage);
    expect(getOldestReplyTargetContextMessage([])).toBeNull();
  });

  it('deduplicates current and context messages while preserving context payloads', () => {
    const currentDuplicate = message({
      id: 'duplicate',
      message: 'cached',
      created_at: '2026-01-01T00:02:00.000Z',
    });
    const contextDuplicate = {
      ...currentDuplicate,
      message: 'fresh context',
    };

    expect(
      mergeAndOrderReplyTargetContextMessages(
        [
          message({ id: 'newer', created_at: '2026-01-01T00:03:00.000Z' }),
          currentDuplicate,
        ],
        [
          contextDuplicate,
          message({ id: 'older', created_at: '2026-01-01T00:01:00.000Z' }),
        ]
      ).map(messageItem => [messageItem.id, messageItem.message])
    ).toEqual([
      ['older', 'hello'],
      ['duplicate', 'fresh context'],
      ['newer', 'hello'],
    ]);
  });
});
