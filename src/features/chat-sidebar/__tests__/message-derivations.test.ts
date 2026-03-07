import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '../../../services/api/chat.service';
import {
  getAttachmentCaptionData,
  getSearchMatchedMessageIds,
  getSelectableMessageIdSet,
  getSelectedVisibleMessages,
  serializeSelectedMessages,
} from '../utils/message-derivations';

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
  sender_name: overrides.sender_name,
  receiver_name: overrides.receiver_name,
  stableKey: overrides.stableKey,
});

describe('message-derivations', () => {
  it('maps attachment captions and excludes caption rows from search/selectable sets', () => {
    const attachmentMessage = buildMessage({
      id: 'file-1',
      message: 'https://example.com/report.pdf',
      message_type: 'file',
      file_name: 'report.pdf',
      file_kind: 'document',
    });
    const captionMessage = buildMessage({
      id: 'caption-1',
      message: 'stok opname maret',
      reply_to_id: 'file-1',
      message_relation_kind: 'attachment_caption',
    });
    const plainTextMessage = buildMessage({
      id: 'text-1',
      message: 'perlu cek batch baru',
    });
    const unrelatedReply = buildMessage({
      id: 'caption-2',
      message: 'should stay as regular reply',
      reply_to_id: 'file-1',
      message_relation_kind: null,
    });
    const messages = [
      attachmentMessage,
      captionMessage,
      plainTextMessage,
      unrelatedReply,
    ];

    const captionData = getAttachmentCaptionData(messages);
    const matchedIds = getSearchMatchedMessageIds(
      messages,
      'stok opname',
      captionData
    );
    const matchedFileNameIds = getSearchMatchedMessageIds(
      messages,
      'report.pdf',
      captionData
    );
    const selectableIds = getSelectableMessageIdSet(
      messages,
      captionData.captionMessageIds
    );

    expect(captionData.captionMessagesByAttachmentId.get('file-1')?.id).toBe(
      'caption-1'
    );
    expect(captionData.captionMessageIds.has('caption-1')).toBe(true);
    expect(matchedIds).toEqual(['file-1']);
    expect(matchedFileNameIds).toEqual(['file-1']);
    expect(selectableIds.has('caption-1')).toBe(false);
    expect(selectableIds.has('caption-2')).toBe(true);
    expect(selectableIds.has('text-1')).toBe(true);
  });

  it('serializes selected messages with sender labels and attachment captions', () => {
    const imageMessage = buildMessage({
      id: 'image-1',
      message: 'https://example.com/image.png',
      message_type: 'image',
      sender_name: 'Admin',
    });
    const captionMessage = buildMessage({
      id: 'caption-1',
      message: 'Rak depan',
      reply_to_id: 'image-1',
      message_relation_kind: 'attachment_caption',
      sender_name: 'Admin',
    });
    const fileMessage = buildMessage({
      id: 'file-1',
      message: 'https://example.com/invoice.pdf',
      message_type: 'file',
      file_name: 'invoice.pdf',
      file_kind: 'document',
      sender_id: 'user-b',
      sender_name: 'Gudang',
      created_at: '2026-03-06T10:00:00.000Z',
      updated_at: '2026-03-06T10:00:00.000Z',
    });

    const captionData = getAttachmentCaptionData([
      imageMessage,
      captionMessage,
      fileMessage,
    ]);
    const selectedMessages = getSelectedVisibleMessages(
      [imageMessage, captionMessage, fileMessage],
      captionData.captionMessageIds,
      new Set(['image-1', 'file-1'])
    );
    const serialized = serializeSelectedMessages(selectedMessages, {
      captionMessagesByAttachmentId: captionData.captionMessagesByAttachmentId,
      currentUser: { id: 'user-a', name: 'Admin' },
      targetUser: { id: 'user-b', name: 'Gudang' },
      getAttachmentFileName: messageItem => messageItem.file_name || 'Lampiran',
    });

    expect(serialized).toContain('Admin: Rak depan');
    expect(serialized).toContain('Gudang: [File: invoice.pdf]');
  });

  it('keeps recognizing legacy attachment captions while the database migration is not applied yet', () => {
    const attachmentMessage = buildMessage({
      id: 'file-legacy',
      message: 'https://example.com/legacy.pdf',
      message_type: 'file',
      file_name: 'legacy.pdf',
      file_kind: 'document',
    });
    const legacyCaptionMessage = buildMessage({
      id: 'caption-legacy',
      message: 'caption lama',
      reply_to_id: 'file-legacy',
    });

    delete legacyCaptionMessage.message_relation_kind;

    const captionData = getAttachmentCaptionData([
      attachmentMessage,
      legacyCaptionMessage,
    ]);

    expect(
      captionData.captionMessagesByAttachmentId.get('file-legacy')?.id
    ).toBe('caption-legacy');
  });
});
