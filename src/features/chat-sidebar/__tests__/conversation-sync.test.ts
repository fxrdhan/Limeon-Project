import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../data/chatSidebarGateway';
import { mergeLatestConversationPageWithExisting } from '../utils/conversation-sync';

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
  message_relation_kind: overrides.message_relation_kind ?? null,
  file_name: overrides.file_name,
  file_kind: overrides.file_kind,
  file_mime_type: overrides.file_mime_type,
  file_size: overrides.file_size,
  file_storage_path: overrides.file_storage_path,
  file_preview_url: overrides.file_preview_url,
  file_preview_page_count: overrides.file_preview_page_count,
  file_preview_status: overrides.file_preview_status,
  file_preview_error: overrides.file_preview_error,
  sender_name: overrides.sender_name ?? 'Admin',
  receiver_name: overrides.receiver_name ?? 'Gudang',
  stableKey: overrides.stableKey,
});

describe('conversation-sync', () => {
  it('preserves cached older persisted messages while refreshing the newest page', () => {
    const previousMessages = [
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
    ];

    const latestMessages = [
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
    ];

    const mergedMessages = mergeLatestConversationPageWithExisting({
      previousMessages,
      latestMessages,
      currentChannelId: 'channel-1',
      preserveOlderPersistedMessages: true,
    });

    expect(mergedMessages.map(message => message.id)).toEqual([
      'message-1',
      'message-2',
      'message-3',
      'message-4',
    ]);
    expect(mergedMessages[2]?.message).toBe('latest-1-fresh');
    expect(mergedMessages[3]?.message).toBe('latest-2-fresh');
  });
});
