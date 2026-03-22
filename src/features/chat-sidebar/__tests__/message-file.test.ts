import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  fetchPdfBlobWithFallback,
  prewarmCopyableChatAssetUrls,
  resetSignedChatAssetUrlCache,
  resolveCopyableChatAssetUrl,
  resolveChatMessageStoragePaths,
} from '../utils/message-file';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';

const { mockStorageService, mockShareGateway } = vi.hoisted(() => ({
  mockStorageService: {
    downloadFile: vi.fn(),
  },
  mockShareGateway: {
    createSharedLink: vi.fn(),
  },
}));

vi.mock('../data/chatSidebarAssetsGateway', () => ({
  chatSidebarAssetsGateway: {
    downloadAsset: mockStorageService.downloadFile,
    createSignedAssetUrl: vi.fn(),
  },
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarShareGateway: mockShareGateway,
}));

describe('message-file utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSignedChatAssetUrlCache();
    chatRuntimeCache.sharedLinks.reset();
  });

  it('falls back to the chat storage gateway when direct fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network failed')) as typeof fetch
    );
    mockStorageService.downloadFile.mockResolvedValue(
      new Blob(['pdf'], { type: 'application/pdf' })
    );

    const pdfBlob = await fetchPdfBlobWithFallback(
      'https://example.com/storage/v1/object/public/chat/documents/channel/stok.pdf?token=123'
    );

    expect(mockStorageService.downloadFile).toHaveBeenCalledWith(
      'documents/channel/stok.pdf'
    );
    expect(pdfBlob).toBeInstanceOf(Blob);
    expect(pdfBlob?.type).toBe('application/pdf');
  });

  it('collects attachment and preview storage paths for persisted pdf messages', () => {
    expect(
      resolveChatMessageStoragePaths({
        message:
          'https://example.com/storage/v1/object/public/chat/documents/channel/stok.pdf',
        message_type: 'file',
        file_name: 'stok.pdf',
        file_mime_type: 'application/pdf',
        file_preview_url:
          'https://example.com/storage/v1/object/public/chat/previews/channel/stok.png',
        file_storage_path: 'documents/channel/stok.pdf',
      })
    ).toEqual(['documents/channel/stok.pdf', 'previews/channel/stok.png']);
  });

  it('collects persisted preview storage paths for image messages', () => {
    expect(
      resolveChatMessageStoragePaths({
        message:
          'https://example.com/storage/v1/object/public/chat/images/channel/foto.png',
        message_type: 'image',
        file_mime_type: 'image/png',
        file_preview_url:
          'https://example.com/storage/v1/object/public/chat/previews/channel/foto.webp',
        file_storage_path: 'images/channel/foto.png',
      })
    ).toEqual(['images/channel/foto.png', 'previews/channel/foto.webp']);
  });

  it('prewarms attachment shared links and reuses the cached short url on copy', async () => {
    mockShareGateway.createSharedLink.mockResolvedValue({
      data: {
        slug: 'stok123abc',
        shortUrl: 'https://shrtlink.works/stok123abc',
        storagePath: 'documents/channel/stok.xlsx',
        targetUrl: null,
      },
      error: null,
    });

    await prewarmCopyableChatAssetUrls([
      {
        id: 'file-1',
        sender_id: 'user-a',
        receiver_id: 'user-b',
        channel_id: 'channel-1',
        message: 'documents/channel/stok.xlsx',
        message_type: 'file',
        created_at: '2026-03-06T09:30:00.000Z',
        updated_at: '2026-03-06T09:30:00.000Z',
        is_read: false,
        is_delivered: false,
        reply_to_id: null,
        file_name: 'stok.xlsx',
        file_kind: 'document',
        file_storage_path: 'documents/channel/stok.xlsx',
      },
      {
        id: 'text-1',
        sender_id: 'user-a',
        receiver_id: 'user-b',
        channel_id: 'channel-1',
        message: 'halo',
        message_type: 'text',
        created_at: '2026-03-06T09:31:00.000Z',
        updated_at: '2026-03-06T09:31:00.000Z',
        is_read: false,
        is_delivered: false,
        reply_to_id: null,
      },
    ]);

    expect(mockShareGateway.createSharedLink).toHaveBeenCalledTimes(1);
    expect(mockShareGateway.createSharedLink).toHaveBeenCalledWith({
      storagePath: 'documents/channel/stok.xlsx',
    });

    const cachedShortUrl = await resolveCopyableChatAssetUrl(
      'documents/channel/stok.xlsx',
      'documents/channel/stok.xlsx',
      {
        messageId: 'file-1',
      }
    );

    expect(cachedShortUrl).toBe('https://shrtlink.works/stok123abc');
    expect(mockShareGateway.createSharedLink).toHaveBeenCalledTimes(1);
  });
});
