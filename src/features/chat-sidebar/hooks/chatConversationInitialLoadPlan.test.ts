import { describe, expect, it } from 'vite-plus/test';
import {
  CHAT_CONVERSATION_CACHE_MAX_MESSAGES,
  CHAT_CONVERSATION_PAGE_SIZE,
} from '../constants';
import type { ChatMessage } from '../data/chatSidebarGateway';
import {
  getInitialConversationRefreshPageSize,
  getRecentCacheableImageMessages,
  getRecentPreviewableImageMessages,
  getUndeliveredIncomingMessageIds,
} from './chatConversationInitialLoadPlan';

const message = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? 'sender-1',
  receiver_id: overrides.receiver_id ?? 'receiver-1',
  channel_id: 'channel-1',
  message: overrides.message ?? 'hello',
  message_type: overrides.message_type ?? 'text',
  created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
  is_read: false,
  is_delivered: overrides.is_delivered,
  reply_to_id: null,
  file_name: overrides.file_name,
  file_mime_type: overrides.file_mime_type,
  file_preview_url: overrides.file_preview_url,
});

describe('chat conversation initial load plan helpers', () => {
  it('bounds refresh page size by page size and conversation cache max messages', () => {
    expect(getInitialConversationRefreshPageSize(0)).toBe(
      CHAT_CONVERSATION_PAGE_SIZE
    );
    expect(
      getInitialConversationRefreshPageSize(
        CHAT_CONVERSATION_CACHE_MAX_MESSAGES + 100
      )
    ).toBe(CHAT_CONVERSATION_CACHE_MAX_MESSAGES);
  });

  it('selects recent previewable image messages newest first', () => {
    const firstImage = message({
      id: 'first-image',
      message_type: 'image',
      file_preview_url: ' previews/first.webp ',
    });
    const secondImage = message({
      id: 'second-image',
      message_type: 'image',
      file_preview_url: 'previews/second.webp',
    });

    expect(
      getRecentPreviewableImageMessages(
        [
          firstImage,
          message({ id: 'text' }),
          message({
            id: 'image-without-preview',
            message_type: 'image',
            file_preview_url: '   ',
          }),
          secondImage,
        ],
        2
      ).map(messageItem => messageItem.id)
    ).toEqual(['second-image', 'first-image']);
  });

  it('selects recent cacheable image messages, including image document attachments', () => {
    const imageFile = message({
      id: 'image-file',
      message_type: 'file',
      message: 'storage/photo.webp',
      file_name: 'photo.webp',
      file_mime_type: 'image/webp',
    });
    const imageMessage = message({
      id: 'image-message',
      message_type: 'image',
    });

    expect(
      getRecentCacheableImageMessages(
        [
          imageFile,
          message({
            id: 'pdf-file',
            message_type: 'file',
            message: 'storage/invoice.pdf',
            file_name: 'invoice.pdf',
            file_mime_type: 'application/pdf',
          }),
          imageMessage,
        ],
        2
      ).map(messageItem => messageItem.id)
    ).toEqual(['image-message', 'image-file']);
  });

  it('collects only undelivered incoming message ids for the active conversation', () => {
    expect(
      getUndeliveredIncomingMessageIds({
        userId: 'user-a',
        targetUserId: 'user-b',
        messages: [
          message({
            id: 'incoming-undelivered',
            sender_id: 'user-b',
            receiver_id: 'user-a',
            is_delivered: false,
          }),
          message({
            id: 'incoming-delivered',
            sender_id: 'user-b',
            receiver_id: 'user-a',
            is_delivered: true,
          }),
          message({
            id: 'outgoing',
            sender_id: 'user-a',
            receiver_id: 'user-b',
            is_delivered: false,
          }),
        ],
      })
    ).toEqual(['incoming-undelivered']);
  });
});
