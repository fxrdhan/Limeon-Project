import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatSessionReceipts } from '../hooks/useChatSessionReceipts';
import type { ChatMessage } from '../data/chatSidebarGateway';

const { mockGateway } = vi.hoisted(() => ({
  mockGateway: {
    markMessageIdsAsDelivered: vi.fn(),
  },
}));
const { mockPendingReadReceipts } = vi.hoisted(() => ({
  mockPendingReadReceipts: {
    queueReadReceiptMessageIdsForSync: vi.fn(
      (_: string, messageIds: string[]) => messageIds
    ),
  },
}));

vi.mock('@/services/api/chat.service', () => ({
  chatMessagesService: mockGateway,
}));

vi.mock('../utils/read-receipt-sync', () => mockPendingReadReceipts);

const buildMessage = (overrides: {
  id: string;
  sender_id?: string;
  receiver_id?: string | null;
  channel_id?: string | null;
  message?: string;
  message_type?: 'text' | 'image' | 'file';
  created_at?: string;
  updated_at?: string;
  is_read?: boolean;
  is_delivered?: boolean;
  reply_to_id?: string | null;
  file_name?: string;
  file_kind?: 'audio' | 'document';
  file_mime_type?: string;
  file_size?: number;
  file_storage_path?: string;
  file_preview_url?: string;
  file_preview_page_count?: number;
  file_preview_status?: string;
  file_preview_error?: string;
  message_relation_kind?: 'attachment_caption' | null;
  sender_name?: string;
  receiver_name?: string;
  stableKey?: string;
}): ChatMessage => ({
  id: overrides.id,
  sender_id: overrides.sender_id ?? 'user-b',
  receiver_id: overrides.receiver_id ?? 'user-a',
  channel_id: overrides.channel_id ?? 'channel-1',
  message: overrides.message ?? 'hello',
  message_type: overrides.message_type ?? 'text',
  created_at: overrides.created_at ?? '2026-03-09T07:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-03-09T07:00:00.000Z',
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
  message_relation_kind: overrides.message_relation_kind,
  sender_name: overrides.sender_name,
  receiver_name: overrides.receiver_name,
  stableKey: overrides.stableKey,
});

describe('useChatSessionReceipts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries delivered receipts after a transient failure', async () => {
    const applyMessageUpdate = vi.fn();

    mockGateway.markMessageIdsAsDelivered
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'temporary failure' },
      })
      .mockResolvedValueOnce({
        data: [
          buildMessage({
            id: 'message-1',
            is_delivered: true,
          }),
        ],
        error: null,
      });

    const { result } = renderHook(() =>
      useChatSessionReceipts({
        applyMessageUpdate,
        isSessionTokenActive: () => true,
        receiptScopeResetKey: 'scope-1',
      })
    );

    await act(async () => {
      await result.current.markMessageIdsAsDelivered(['message-1'], 1);
    });

    expect(mockGateway.markMessageIdsAsDelivered).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1_200);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockGateway.markMessageIdsAsDelivered).toHaveBeenCalledTimes(2);
    expect(applyMessageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'message-1',
        is_delivered: true,
      })
    );
  });

  it('queues read receipts outside the scope-bound mutation queue', async () => {
    const applyMessageUpdate = vi.fn();

    const { result, rerender } = renderHook(
      ({ receiptScopeResetKey }: { receiptScopeResetKey: string | null }) =>
        useChatSessionReceipts({
          applyMessageUpdate,
          currentUserId: 'user-a',
          isSessionTokenActive: () => true,
          receiptScopeResetKey,
        }),
      {
        initialProps: {
          receiptScopeResetKey: 'scope-1',
        },
      }
    );

    await act(async () => {
      await result.current.markMessageIdsAsRead(['message-2']);
    });

    expect(
      mockPendingReadReceipts.queueReadReceiptMessageIdsForSync
    ).toHaveBeenCalledWith('user-a', ['message-2']);
    expect(applyMessageUpdate).toHaveBeenCalledWith({
      id: 'message-2',
      is_read: true,
      is_delivered: true,
    });

    rerender({
      receiptScopeResetKey: 'scope-2',
    });

    await act(async () => {
      vi.advanceTimersByTime(1_200);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(
      mockPendingReadReceipts.queueReadReceiptMessageIdsForSync
    ).toHaveBeenCalledTimes(1);
  });
});
