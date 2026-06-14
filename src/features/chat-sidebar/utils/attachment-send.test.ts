import { describe, expect, it, vi } from 'vite-plus/test';
import type { ChatMessage } from '../data/chatSidebarGateway';
import {
  createOptimisticAttachmentThread,
  prepareAttachmentOptimisticTransaction,
} from './attachment-send';

const user = {
  id: 'user-1',
  name: 'Apoteker',
};

const targetUser = {
  id: 'target-1',
  name: 'Kasir',
};

const buildOptimisticMessage = ({
  tempId,
  stableKey,
  localPreviewUrl,
  timestamp,
  replyToId,
}: {
  tempId: string;
  stableKey: string;
  localPreviewUrl: string;
  timestamp: string;
  replyToId: string | null;
}): ChatMessage => ({
  id: tempId,
  sender_id: user.id,
  receiver_id: targetUser.id,
  channel_id: 'channel-1',
  message: localPreviewUrl,
  message_type: 'image',
  created_at: timestamp,
  updated_at: timestamp,
  is_read: false,
  reply_to_id: replyToId,
  sender_name: user.name,
  receiver_name: targetUser.name,
  stableKey,
});

const baseParams = {
  tempIdPrefix: 'temp_image',
  stableKeySuffix: 'image',
  currentChannelId: 'channel-1',
  user,
  targetUser,
  buildOptimisticMessage,
};

describe('attachment send optimistic transaction helpers', () => {
  it('builds a fresh optimistic thread from a local file', () => {
    const file = new File(['image'], 'stok.png', { type: 'image/png' });
    const createLocalPreviewUrl = vi.fn(() => 'blob:generated-preview');

    const result = prepareAttachmentOptimisticTransaction({
      ...baseParams,
      file,
      captionText: '  Bukti stok  ',
      replyToId: 'reply-1',
      timestamp: '2026-01-01T00:00:00.000Z',
      createLocalPreviewUrl,
    });

    expect(createLocalPreviewUrl).toHaveBeenCalledWith(file);
    expect(result.localPreviewUrl).toBe('blob:generated-preview');
    expect(result.shouldAppendOptimistic).toBe(true);
    expect(result.optimisticThread).toMatchObject({
      normalizedCaptionText: 'Bukti stok',
      hasAttachmentCaption: true,
      optimisticMessage: {
        message: 'blob:generated-preview',
        reply_to_id: 'reply-1',
        created_at: '2026-01-01T00:00:00.000Z',
      },
      optimisticCaptionMessage: {
        message: 'Bukti stok',
        reply_to_id: result.optimisticThread.tempId,
      },
    });
  });

  it('reuses prepared optimistic state without creating another preview URL', () => {
    const createLocalPreviewUrl = vi.fn(() => 'blob:unused-preview');
    const thread = createOptimisticAttachmentThread({
      ...baseParams,
      captionText: undefined,
      localPreviewUrl: 'blob:prepared-thread-preview',
      replyToId: null,
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    const result = prepareAttachmentOptimisticTransaction({
      ...baseParams,
      file: new File(['image'], 'stok.png', { type: 'image/png' }),
      optimistic: {
        appendBeforeSend: false,
        localPreviewUrl: 'blob:prepared-state-preview',
        thread,
      },
      replyToId: null,
      createLocalPreviewUrl,
    });

    expect(createLocalPreviewUrl).not.toHaveBeenCalled();
    expect(result.optimisticThread).toBe(thread);
    expect(result.localPreviewUrl).toBe('blob:prepared-state-preview');
    expect(result.shouldAppendOptimistic).toBe(false);
  });
});
