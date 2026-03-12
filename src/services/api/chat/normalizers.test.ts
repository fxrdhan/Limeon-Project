import { describe, expect, it } from 'vitest';
import {
  extractRealtimeChatMessageId,
  normalizeRealtimeChatMessage,
} from './normalizers';

describe('chat realtime normalizers', () => {
  it('normalizes partial realtime payloads into a stable chat message shape', () => {
    const normalizedMessage = normalizeRealtimeChatMessage({
      id: 'message-1',
      sender_id: 'user-a',
      receiver_id: 'user-b',
      channel_id: 'dm_user-a_user-b',
      message: 'stok datang',
      message_type: 'text',
      updated_at: '2026-03-12T10:00:00.000Z',
    });

    expect(normalizedMessage).toEqual({
      id: 'message-1',
      sender_id: 'user-a',
      receiver_id: 'user-b',
      channel_id: 'dm_user-a_user-b',
      message: 'stok datang',
      reply_to_id: null,
      created_at: '2026-03-12T10:00:00.000Z',
      updated_at: '2026-03-12T10:00:00.000Z',
      is_read: false,
      is_delivered: false,
      message_type: 'text',
      message_relation_kind: null,
      file_name: null,
      file_kind: undefined,
      file_mime_type: null,
      file_size: null,
      file_storage_path: null,
      file_preview_url: null,
      file_preview_page_count: null,
      file_preview_status: null,
      file_preview_error: null,
    });
  });

  it('extracts realtime message ids defensively', () => {
    expect(extractRealtimeChatMessageId({ id: 'message-1' })).toBe('message-1');
    expect(extractRealtimeChatMessageId({ id: '' })).toBeNull();
    expect(extractRealtimeChatMessageId({ id: undefined })).toBeNull();
  });
});
