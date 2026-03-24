import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { useMessagesPanePreviews } from '../hooks/useMessagesPanePreviews';

const { mockEnsureChannelImageAssetUrl, mockGetRuntimeChannelImageAssetUrl } =
  vi.hoisted(() => ({
    mockEnsureChannelImageAssetUrl: vi.fn(),
    mockGetRuntimeChannelImageAssetUrl: vi.fn(),
  }));

const {
  mockFetchChatFileBlobWithFallback,
  mockFetchPdfBlobWithFallback,
  mockGetCachedResolvedChatAssetUrl,
  mockOpenDocumentPreview,
  mockResolveChatAssetUrl,
} = vi.hoisted(() => ({
  mockFetchChatFileBlobWithFallback: vi.fn(),
  mockFetchPdfBlobWithFallback: vi.fn(),
  mockGetCachedResolvedChatAssetUrl: vi.fn(),
  mockOpenDocumentPreview: vi.fn(),
  mockResolveChatAssetUrl: vi.fn(),
}));

vi.mock('../utils/channel-image-asset-cache', () => ({
  ensureChannelImageAssetUrl: mockEnsureChannelImageAssetUrl,
  getRuntimeChannelImageAssetUrl: mockGetRuntimeChannelImageAssetUrl,
}));

vi.mock('../utils/message-file', () => ({
  fetchChatFileBlobWithFallback: mockFetchChatFileBlobWithFallback,
  fetchPdfBlobWithFallback: mockFetchPdfBlobWithFallback,
  getCachedResolvedChatAssetUrl: mockGetCachedResolvedChatAssetUrl,
  isDirectChatAssetUrl: vi.fn((url: string) =>
    /^(https?:\/\/|blob:|data:|\/)/i.test(url)
  ),
  resolveChatAssetUrl: mockResolveChatAssetUrl,
}));

vi.mock('../hooks/useDocumentPreviewPortal', () => ({
  useDocumentPreviewPortal: () => ({
    previewUrl: null,
    previewName: '',
    isPreviewVisible: false,
    closeDocumentPreview: vi.fn(),
    openDocumentPreview: mockOpenDocumentPreview,
  }),
}));

describe('useMessagesPanePreviews', () => {
  const flushMicrotasks = async (count = 4) => {
    for (let index = 0; index < count; index += 1) {
      await Promise.resolve();
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    mockEnsureChannelImageAssetUrl.mockImplementation(
      async (
        _channelId,
        message: { id: string },
        variant: 'thumbnail' | 'full'
      ) => `blob:${variant}-${message.id}`
    );
    mockGetRuntimeChannelImageAssetUrl.mockReturnValue(null);
    mockGetCachedResolvedChatAssetUrl.mockReturnValue(null);
    mockResolveChatAssetUrl.mockResolvedValue(null);
    mockFetchChatFileBlobWithFallback.mockResolvedValue(null);
    mockFetchPdfBlobWithFallback.mockResolvedValue(null);
    mockOpenDocumentPreview.mockResolvedValue(true);
  });

  it('opens single-image previews from the active channel cache first', async () => {
    mockGetRuntimeChannelImageAssetUrl.mockImplementation(
      (_channelId, messageId: string, variant: 'thumbnail' | 'full') => {
        if (messageId === 'image-single-1' && variant === 'full') {
          return 'blob:full-image-single-1';
        }
        return null;
      }
    );

    const { result } = renderHook(() =>
      useMessagesPanePreviews({
        currentChannelId: 'dm_user-a_user-b',
      })
    );

    await act(async () => {
      await result.current.openImageInPortal(
        {
          id: 'image-single-1',
          message: 'images/channel/image-single-1.png',
          file_storage_path: 'images/channel/image-single-1.png',
          file_mime_type: 'image/png',
          file_preview_url: null,
        },
        'Lampiran'
      );
      await flushMicrotasks();
    });

    expect(result.current.imagePreviewBackdropUrl).toBe(
      'blob:full-image-single-1'
    );
    expect(result.current.imagePreviewUrl).toBe('blob:full-image-single-1');
    expect(mockEnsureChannelImageAssetUrl).not.toHaveBeenCalled();
  });

  it('opens grouped image previews with cached full assets for the active item', async () => {
    mockGetRuntimeChannelImageAssetUrl.mockImplementation(
      (_channelId, messageId: string, variant: 'thumbnail' | 'full') => {
        if (messageId === 'image-b' && variant === 'full') {
          return 'blob:full-image-b';
        }
        return null;
      }
    );

    const { result } = renderHook(() =>
      useMessagesPanePreviews({
        currentChannelId: 'dm_user-a_user-b',
      })
    );

    await act(async () => {
      await result.current.openImageGroupInPortal(
        [
          {
            id: 'image-a',
            message: 'images/channel/a.png',
            file_storage_path: 'images/channel/a.png',
            file_mime_type: 'image/png',
            file_name: 'A.png',
            file_preview_url: null,
          },
          {
            id: 'image-b',
            message: 'images/channel/b.png',
            file_storage_path: 'images/channel/b.png',
            file_mime_type: 'image/png',
            file_name: 'B.png',
            file_preview_url: null,
          },
        ],
        'image-b'
      );
      await flushMicrotasks();
    });

    expect(result.current.activeImageGroupPreviewId).toBe('image-b');
    expect(result.current.imageGroupPreviewItems).toEqual([
      {
        id: 'image-a',
        thumbnailUrl: 'blob:full-image-a',
        previewUrl: 'blob:full-image-a',
        fullPreviewUrl: 'blob:full-image-a',
        previewName: 'A.png',
      },
      {
        id: 'image-b',
        thumbnailUrl: 'blob:full-image-b',
        previewUrl: 'blob:full-image-b',
        fullPreviewUrl: 'blob:full-image-b',
        previewName: 'B.png',
      },
    ]);
  });

  it('hydrates a newly selected grouped image from runtime full cache without waiting for network', async () => {
    mockGetRuntimeChannelImageAssetUrl.mockImplementation(
      (_channelId, messageId: string, variant: 'thumbnail' | 'full') => {
        if (messageId === 'image-b' && variant === 'full') {
          return 'blob:full-image-b';
        }
        return null;
      }
    );

    const { result } = renderHook(() =>
      useMessagesPanePreviews({
        currentChannelId: 'dm_user-a_user-b',
      })
    );

    await act(async () => {
      await result.current.openImageGroupInPortal([
        {
          id: 'image-a',
          message: 'images/channel/a.png',
          file_storage_path: 'images/channel/a.png',
          file_mime_type: 'image/png',
          file_name: 'A.png',
          file_preview_url: null,
        },
        {
          id: 'image-b',
          message: 'images/channel/b.png',
          file_storage_path: 'images/channel/b.png',
          file_mime_type: 'image/png',
          file_name: 'B.png',
          file_preview_url: null,
        },
      ]);
      await flushMicrotasks();
    });

    act(() => {
      result.current.selectImageGroupPreviewItem('image-b');
    });

    expect(result.current.imageGroupPreviewItems[1]).toEqual({
      id: 'image-b',
      thumbnailUrl: 'blob:full-image-b',
      previewUrl: 'blob:full-image-b',
      fullPreviewUrl: 'blob:full-image-b',
      previewName: 'B.png',
    });
  });
});
