import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useChatMessageTransferActions } from '../hooks/useChatMessageTransferActions';

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
    success: vi.fn(),
    promise: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

const buildMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? 'user-a',
  receiver_id: overrides.receiver_id ?? 'user-b',
  channel_id: overrides.channel_id ?? 'channel-1',
  message: overrides.message ?? 'https://example.com/stok.pdf',
  message_type: overrides.message_type ?? 'file',
  created_at: overrides.created_at ?? '2026-03-06T09:30:00.000Z',
  updated_at: overrides.updated_at ?? '2026-03-06T09:30:00.000Z',
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? false,
  reply_to_id: overrides.reply_to_id ?? null,
  file_name: overrides.file_name ?? 'stok.pdf',
  file_kind: overrides.file_kind ?? 'document',
  file_mime_type: overrides.file_mime_type ?? 'application/pdf',
  file_size: overrides.file_size ?? 1024,
  file_storage_path:
    overrides.file_storage_path ?? 'documents/channel/stok.pdf',
  file_preview_url: overrides.file_preview_url ?? null,
  file_preview_page_count: overrides.file_preview_page_count ?? null,
  file_preview_status: overrides.file_preview_status ?? null,
  file_preview_error: overrides.file_preview_error ?? null,
  sender_name: overrides.sender_name ?? 'Admin',
  receiver_name: overrides.receiver_name ?? 'Gudang',
  stableKey: overrides.stableKey,
});

describe('useChatMessageTransferActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('copies file messages as labeled attachment text instead of the raw url only', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const closeMessageMenu = vi.fn();

    const { result } = renderHook(() =>
      useChatMessageTransferActions({
        closeMessageMenu,
      })
    );

    await act(async () => {
      await result.current.handleCopyMessage(
        buildMessage({
          message_type: 'file',
          message: 'https://example.com/storage/stok.pdf',
          file_name: 'stok.pdf',
        })
      );
    });

    expect(writeText).toHaveBeenCalledWith(
      '[File: stok.pdf] https://example.com/storage/stok.pdf'
    );
    expect(mockToast.success).toHaveBeenCalledWith(
      'Lampiran berhasil disalin',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
    expect(closeMessageMenu).toHaveBeenCalledOnce();
  });
});
