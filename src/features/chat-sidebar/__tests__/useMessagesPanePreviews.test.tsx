import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vite-plus/test';
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

vi.mock('../utils/chatRuntime', () => ({
  chatRuntime: {
    imageAssets: {
      ensureUrl: mockEnsureChannelImageAssetUrl,
      getUrl: mockGetRuntimeChannelImageAssetUrl,
    },
  },
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
  const closeMessageMenu = vi.fn();
  const flushMicrotasks = async (count = 4) => {
    for (let index = 0; index < count; index += 1) {
      await Promise.resolve();
    }
  };
  const originalMatchMedia = window.matchMedia;

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
    closeMessageMenu.mockReset();
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
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
        closeMessageMenu,
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
    expect(closeMessageMenu).toHaveBeenCalledTimes(1);
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
        closeMessageMenu,
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
    expect(closeMessageMenu).toHaveBeenCalledTimes(1);
    expect(result.current.imageGroupPreviewItems).toEqual([
      {
        id: 'image-a',
        thumbnailUrl: 'blob:thumbnail-image-a',
        previewUrl: null,
        fullPreviewUrl: null,
        previewName: 'A.png',
      },
      {
        id: 'image-b',
        thumbnailUrl: 'blob:thumbnail-image-b',
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
        closeMessageMenu,
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
      thumbnailUrl: 'blob:thumbnail-image-b',
      previewUrl: 'blob:full-image-b',
      fullPreviewUrl: 'blob:full-image-b',
      previewName: 'B.png',
    });
  });

  it('keeps non-active grouped items on lightweight thumbnails until selected', async () => {
    mockGetRuntimeChannelImageAssetUrl.mockImplementation(
      (_channelId, messageId: string, variant: 'thumbnail' | 'full') => {
        if (variant === 'thumbnail') {
          return `blob:thumb-${messageId}`;
        }

        return null;
      }
    );

    const { result } = renderHook(() =>
      useMessagesPanePreviews({
        currentChannelId: 'dm_user-a_user-b',
        closeMessageMenu,
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
        'image-a'
      );
      await flushMicrotasks();
    });

    expect(result.current.imageGroupPreviewItems).toEqual([
      {
        id: 'image-a',
        thumbnailUrl: 'blob:thumb-image-a',
        previewUrl: 'blob:full-image-a',
        fullPreviewUrl: 'blob:full-image-a',
        previewName: 'A.png',
      },
      {
        id: 'image-b',
        thumbnailUrl: 'blob:thumb-image-b',
        previewUrl: null,
        fullPreviewUrl: null,
        previewName: 'B.png',
      },
    ]);
  });

  it('does not promote a thumbnail seed into the active grouped full preview', async () => {
    mockEnsureChannelImageAssetUrl.mockImplementation(
      async (
        _channelId,
        message: { id: string },
        variant: 'thumbnail' | 'full'
      ) => {
        if (variant === 'thumbnail') {
          return `blob:thumbnail-${message.id}`;
        }

        return await new Promise<string>(resolve => {
          window.setTimeout(() => {
            resolve(`blob:full-${message.id}`);
          }, 50);
        });
      }
    );

    const { result } = renderHook(() =>
      useMessagesPanePreviews({
        currentChannelId: 'dm_user-a_user-b',
        closeMessageMenu,
      })
    );

    let openPromise: Promise<void>;

    await act(async () => {
      openPromise = result.current.openImageGroupInPortal(
        [
          {
            id: 'image-a',
            message: 'images/channel/a.png',
            file_storage_path: 'images/channel/a.png',
            file_mime_type: 'image/png',
            file_name: 'A.png',
            file_preview_url: null,
            previewUrl: 'blob:thumbnail-image-a',
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
        'image-a',
        'blob:thumbnail-image-a'
      );
      await flushMicrotasks();
    });

    expect(result.current.imageGroupPreviewItems).toEqual([]);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60);
      await openPromise!;
      await flushMicrotasks();
    });

    expect(result.current.imageGroupPreviewItems[0]).toEqual({
      id: 'image-a',
      thumbnailUrl: 'blob:thumbnail-image-a',
      previewUrl: null,
      fullPreviewUrl: 'blob:full-image-a',
      previewName: 'A.png',
    });
  });

  it('opens pdf previews in a new tab on coarse-pointer devices', async () => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(hover: none) and (pointer: coarse)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    mockResolveChatAssetUrl.mockResolvedValue(
      'https://example.com/invoice.pdf'
    );
    const replace = vi.fn();
    const close = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({
      close,
      location: { replace },
    } as unknown as Window);

    const { result } = renderHook(() =>
      useMessagesPanePreviews({
        currentChannelId: 'dm_user-a_user-b',
        closeMessageMenu,
      })
    );

    await act(async () => {
      await result.current.openDocumentInPortal(
        {
          message: 'documents/channel/invoice.pdf',
          file_storage_path: 'documents/channel/invoice.pdf',
        },
        'invoice.pdf',
        true
      );
      await flushMicrotasks();
    });

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(replace).toHaveBeenCalledWith('https://example.com/invoice.pdf');
    expect(mockOpenDocumentPreview).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    expect(closeMessageMenu).toHaveBeenCalledTimes(1);
  });

  it('falls back to the in-app portal when coarse-pointer tab opening is blocked', async () => {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(hover: none) and (pointer: coarse)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    vi.spyOn(window, 'open').mockReturnValue(null);

    const { result } = renderHook(() =>
      useMessagesPanePreviews({
        currentChannelId: 'dm_user-a_user-b',
        closeMessageMenu,
      })
    );

    await act(async () => {
      await result.current.openDocumentInPortal(
        {
          message: 'documents/channel/invoice.pdf',
          file_storage_path: 'documents/channel/invoice.pdf',
        },
        'invoice.pdf',
        true
      );
      await flushMicrotasks();
    });

    expect(mockOpenDocumentPreview).toHaveBeenCalledTimes(1);
    expect(closeMessageMenu).toHaveBeenCalledTimes(1);
  });
});
