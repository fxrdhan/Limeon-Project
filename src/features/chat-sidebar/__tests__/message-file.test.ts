import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  fetchPdfBlobWithFallback,
  resetSignedChatAssetUrlCache,
  resolveChatMessageStoragePaths,
} from '../utils/message-file';

const { mockStorageService } = vi.hoisted(() => ({
  mockStorageService: {
    downloadFile: vi.fn(),
  },
}));

vi.mock('../data/chatSidebarAssetsGateway', () => ({
  chatSidebarAssetsGateway: {
    downloadAsset: mockStorageService.downloadFile,
    createSignedAssetUrl: vi.fn(),
  },
}));

describe('message-file utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSignedChatAssetUrlCache();
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
});
