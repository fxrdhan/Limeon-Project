import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../../../services/api/chat.service';
import { commitOptimisticMessage } from '../utils/optimistic-message';

const buildMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? 'user-a',
  receiver_id: overrides.receiver_id ?? 'user-b',
  channel_id: overrides.channel_id ?? 'channel-1',
  message: overrides.message ?? 'hello',
  message_type: overrides.message_type ?? 'text',
  created_at: overrides.created_at ?? '2026-03-06T09:30:00.000Z',
  updated_at: overrides.updated_at ?? '2026-03-06T09:30:00.000Z',
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? false,
  reply_to_id: overrides.reply_to_id ?? null,
  file_name: overrides.file_name,
  file_kind: overrides.file_kind,
  file_mime_type: overrides.file_mime_type,
  file_size: overrides.file_size,
  file_storage_path: overrides.file_storage_path,
  file_preview_url: overrides.file_preview_url,
  file_preview_page_count: overrides.file_preview_page_count,
  file_preview_status: overrides.file_preview_status,
  file_preview_error: overrides.file_preview_error,
  sender_name: overrides.sender_name,
  receiver_name: overrides.receiver_name,
  stableKey: overrides.stableKey,
});

describe('optimistic-message utils', () => {
  it('dedupes the persisted row when a temp message is reconciled after server hydration', () => {
    const persistedMessage = buildMessage({
      id: 'message-1',
      stableKey: 'stable-1',
    });
    const tempMessage = buildMessage({
      id: 'temp_1',
      stableKey: 'stable-1',
    });

    const nextMessages = commitOptimisticMessage(
      [persistedMessage, tempMessage],
      'temp_1',
      persistedMessage
    );

    expect(nextMessages).toEqual([persistedMessage]);
  });
});
