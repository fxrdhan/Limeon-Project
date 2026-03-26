import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
  fetchPdfBlobWithFallback,
  resetSignedChatAssetUrlCache,
  resolveCopyableChatAssetUrl,
  resolveChatMessageStoragePaths,
} from '../utils/message-file';

const { mockStorageService, mockShareGateway } = vi.hoisted(() => ({
  mockStorageService: {
    downloadFile: vi.fn(),
    createSignedAssetUrl: vi.fn(),
  },
  mockShareGateway: {
    createSharedLink: vi.fn(),
    buildShortUrl: vi.fn((slug: string) => `https://shrtlink.works/${slug}`),
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
  supabaseUrl: 'https://example.supabase.co',
}));

vi.mock('../data/chatSidebarAssetsGateway', () => ({
  chatSidebarAssetsGateway: {
    downloadAsset: mockStorageService.downloadFile,
    createSignedAssetUrl: mockStorageService.createSignedAssetUrl,
  },
}));

vi.mock('../data/chatSidebarGateway', () => ({
  chatSidebarShareGateway: mockShareGateway,
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

  it('requests the attachment short link by messageId when payload slug is missing', async () => {
    mockShareGateway.createSharedLink.mockResolvedValue({
      data: {
        slug: 'stak234abc',
        shortUrl: 'https://shrtlink.works/stak234abc',
        storagePath: 'documents/channel/stok.xlsx',
      },
      error: null,
    });

    const shortUrl = await resolveCopyableChatAssetUrl(
      'documents/channel/stok.xlsx',
      'documents/channel/stok.xlsx',
      {
        messageId: 'file-1',
      }
    );

    expect(shortUrl).toBe('https://shrtlink.works/stak234abc');
    expect(mockShareGateway.createSharedLink).toHaveBeenCalledTimes(1);
    expect(mockShareGateway.createSharedLink).toHaveBeenCalledWith({
      messageId: 'file-1',
    });
  });

  it('builds the copyable short url directly from the message shared_link_slug', async () => {
    const shortUrl = await resolveCopyableChatAssetUrl(
      'documents/channel/stok.xlsx',
      'documents/channel/stok.xlsx',
      {
        messageId: 'file-1',
        sharedLinkSlug: 'stak234abc',
      }
    );

    expect(shortUrl).toBe('https://shrtlink.works/stak234abc');
    expect(mockShareGateway.createSharedLink).not.toHaveBeenCalled();
  });

  it('does not fall back to a signed storage url when short-link fallback is disabled', async () => {
    mockShareGateway.createSharedLink.mockResolvedValue({
      data: null,
      error: {
        code: '403',
        details: '',
        hint: '',
        message: 'Forbidden',
        name: 'FunctionsHttpError',
      },
    });
    mockStorageService.createSignedAssetUrl.mockResolvedValue(
      'https://example.supabase.co/storage/v1/object/sign/chat/images/channel/user-1_photo.png?token=abc'
    );

    const shortUrl = await resolveCopyableChatAssetUrl(
      'images/channel/user-1_photo.png',
      'images/channel/user-1_photo.png',
      {
        allowAssetUrlFallback: false,
        messageId: 'file-1',
      }
    );

    expect(shortUrl).toBeNull();
    expect(mockShareGateway.createSharedLink).toHaveBeenCalledWith({
      messageId: 'file-1',
    });
    expect(mockStorageService.createSignedAssetUrl).not.toHaveBeenCalled();
  });
});
