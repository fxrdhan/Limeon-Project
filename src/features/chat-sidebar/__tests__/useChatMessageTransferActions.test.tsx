import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useChatMessageTransferActions } from '../hooks/useChatMessageTransferActions';

const { mockToast, mockGateway } = vi.hoisted(() => ({
  mockToast: {
    error: vi.fn(),
    success: vi.fn(),
    promise: vi.fn(),
  },
  mockGateway: {
    downloadStorageFile: vi.fn(),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: mockToast,
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarGateway: mockGateway,
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
    mockToast.promise.mockImplementation(async promise => await promise);
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

  it('downloads attachments through the storage fallback when direct fetch fails', async () => {
    const closeMessageMenu = vi.fn();
    const downloadBlob = new Blob(['stok'], { type: 'application/pdf' });
    const anchorClick = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    const appendSpy = vi
      .spyOn(document.body, 'append')
      .mockImplementation(() => undefined);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(tagName => {
        if (tagName === 'a') {
          return {
            click: anchorClick,
            remove: vi.fn(),
            href: '',
            download: '',
            rel: '',
          } as unknown as HTMLAnchorElement;
        }

        return originalCreateElement(tagName);
      });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('fetch failed'))
    );
    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn().mockReturnValue('blob:download'),
        revokeObjectURL,
      })
    );
    mockGateway.downloadStorageFile.mockResolvedValue(downloadBlob);

    const { result } = renderHook(() =>
      useChatMessageTransferActions({
        closeMessageMenu,
      })
    );

    await act(async () => {
      await result.current.handleDownloadMessage(
        buildMessage({
          message:
            'https://example.com/storage/v1/object/sign/chat/documents/channel/stok.pdf?token=123',
          file_storage_path: 'documents/channel/stok.pdf',
        })
      );
    });

    expect(mockGateway.downloadStorageFile).toHaveBeenCalledWith(
      'chat',
      'documents/channel/stok.pdf'
    );
    expect(anchorClick).toHaveBeenCalledOnce();
    expect(closeMessageMenu).toHaveBeenCalledOnce();

    createElementSpy.mockRestore();
    appendSpy.mockRestore();
  });

  it('copies image messages through the storage fallback when direct fetch fails', async () => {
    const closeMessageMenu = vi.fn();
    const write = vi.fn().mockResolvedValue(undefined);
    const imageBlob = new Blob(['image'], { type: 'image/png' });

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { write, writeText: vi.fn() },
    });
    vi.stubGlobal(
      'ClipboardItem',
      class ClipboardItem {
        static supports = vi.fn().mockReturnValue(true);

        constructor(public items: Record<string, Blob>) {}
      }
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('fetch failed'))
    );
    mockGateway.downloadStorageFile.mockResolvedValue(imageBlob);

    const { result } = renderHook(() =>
      useChatMessageTransferActions({
        closeMessageMenu,
      })
    );

    await act(async () => {
      await result.current.handleCopyMessage(
        buildMessage({
          message_type: 'image',
          message:
            'https://example.com/storage/v1/object/sign/chat/images/channel/stok.png?token=123',
          file_name: 'stok.png',
          file_mime_type: 'image/png',
          file_storage_path: 'images/channel/stok.png',
        })
      );
    });

    expect(mockGateway.downloadStorageFile).toHaveBeenCalledWith(
      'chat',
      'images/channel/stok.png'
    );
    expect(write).toHaveBeenCalledOnce();
    expect(mockToast.success).toHaveBeenCalledWith(
      'Gambar berhasil disalin',
      expect.objectContaining({
        toasterId: 'chat-sidebar-toaster',
      })
    );
    expect(closeMessageMenu).toHaveBeenCalledOnce();
  });
});
