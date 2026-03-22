import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { IMAGE_EXPAND_STAGE_TARGET_SIZE } from '../constants';
import { useMessagesPanePreviews } from '../hooks/useMessagesPanePreviews';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';
import { imageExpandStageStore } from '../utils/chatRuntimeState';

const {
  mockFetchChatFileBlobWithFallback,
  mockFetchPdfBlobWithFallback,
  mockLoadPersistedImagePreviewEntriesByMessageIds,
  mockOpenDocumentPreview,
  mockResolveChatAssetUrl,
} = vi.hoisted(() => ({
  mockFetchChatFileBlobWithFallback: vi.fn(),
  mockFetchPdfBlobWithFallback: vi.fn(),
  mockLoadPersistedImagePreviewEntriesByMessageIds: vi.fn(),
  mockOpenDocumentPreview: vi.fn(),
  mockResolveChatAssetUrl: vi.fn(),
}));

vi.mock('../utils/message-file', () => ({
  fetchChatFileBlobWithFallback: mockFetchChatFileBlobWithFallback,
  fetchPdfBlobWithFallback: mockFetchPdfBlobWithFallback,
  isDirectChatAssetUrl: vi.fn(() => false),
  resolveChatAssetUrl: mockResolveChatAssetUrl,
}));

vi.mock('../utils/image-preview-persistence', () => ({
  loadPersistedImagePreviewEntriesByMessageIds:
    mockLoadPersistedImagePreviewEntriesByMessageIds,
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
  let createObjectURLMock: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLMock: ReturnType<typeof vi.spyOn>;
  const flushMicrotasks = async (count = 4) => {
    for (let index = 0; index < count; index += 1) {
      await Promise.resolve();
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    chatRuntimeCache.imagePreviews.reset();
    mockResolveChatAssetUrl.mockResolvedValue(null);
    mockLoadPersistedImagePreviewEntriesByMessageIds.mockResolvedValue([]);
    mockOpenDocumentPreview.mockResolvedValue(true);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      callback(0);
      return 1;
    });
    createObjectURLMock = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:chat-image-preview');
    revokeObjectURLMock = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
  });

  it('opens image previews from a fetched storage fallback blob', async () => {
    mockFetchChatFileBlobWithFallback.mockResolvedValue(
      new Blob(['image'], { type: 'image/png' })
    );

    const { result } = renderHook(() => useMessagesPanePreviews());

    await act(async () => {
      await result.current.openImageInPortal(
        {
          id: 'image-single-1',
          message:
            'https://example.com/storage/v1/object/sign/chat/images/channel/a.png',
          file_storage_path: 'images/channel/a.png',
          file_mime_type: 'image/png',
          file_preview_url: null,
        },
        'Lampiran'
      );
    });

    expect(mockFetchChatFileBlobWithFallback).toHaveBeenCalledWith(
      'https://example.com/storage/v1/object/sign/chat/images/channel/a.png',
      'images/channel/a.png',
      'image/png'
    );
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(result.current.isImagePreviewOpen).toBe(true);
    expect(result.current.imagePreviewUrl).toBe('blob:chat-image-preview');
    expect(result.current.imagePreviewBackdropUrl).toBe(
      'blob:chat-image-preview'
    );
    expect(result.current.imagePreviewStageUrls).toEqual([]);
    expect(result.current.imagePreviewName).toBe('Lampiran');
    expect(result.current.isImagePreviewVisible).toBe(true);

    act(() => {
      result.current.closeImagePreview();
      vi.advanceTimersByTime(150);
    });

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:chat-image-preview');
    expect(result.current.imagePreviewUrl).toBeNull();
    expect(result.current.imagePreviewBackdropUrl).toBeNull();
    expect(result.current.imagePreviewStageUrls).toEqual([]);
  });

  it('opens grouped image previews with the requested active item', async () => {
    mockResolveChatAssetUrl
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(
        'https://example.com/storage/v1/object/sign/chat/images/channel/a.png'
      );
    mockFetchChatFileBlobWithFallback.mockResolvedValueOnce(
      new Blob(['image-b'], { type: 'image/png' })
    );
    createObjectURLMock.mockReturnValueOnce('blob:chat-group-image-b');

    const { result } = renderHook(() => useMessagesPanePreviews());

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

    expect(result.current.imageGroupPreviewItems).toEqual([
      {
        id: 'image-a',
        thumbnailUrl:
          'https://example.com/storage/v1/object/sign/chat/images/channel/a.png',
        previewUrl:
          'https://example.com/storage/v1/object/sign/chat/images/channel/a.png',
        stageUrls: [],
        fullPreviewUrl:
          'https://example.com/storage/v1/object/sign/chat/images/channel/a.png',
        previewName: 'A.png',
      },
      {
        id: 'image-b',
        thumbnailUrl: 'blob:chat-group-image-b',
        previewUrl: 'blob:chat-group-image-b',
        stageUrls: [],
        fullPreviewUrl: 'blob:chat-group-image-b',
        previewName: 'B.png',
      },
    ]);
    expect(result.current.activeImageGroupPreviewId).toBe('image-b');
    expect(result.current.isImageGroupPreviewVisible).toBe(true);

    act(() => {
      result.current.closeImageGroupPreview();
      vi.advanceTimersByTime(150);
    });

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:chat-group-image-b');
    expect(result.current.imageGroupPreviewItems).toEqual([]);
    expect(result.current.activeImageGroupPreviewId).toBeNull();
  });

  it('prioritizes a newly selected grouped image even when the initial image is still loading', async () => {
    let resolveFirstImageUrl: ((value: string | null) => void) | null = null;
    mockResolveChatAssetUrl
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFirstImageUrl = resolve;
          })
      )
      .mockResolvedValueOnce(
        'https://example.com/storage/v1/object/sign/chat/images/channel/b.png'
      );

    const { result } = renderHook(() => useMessagesPanePreviews());

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
    });

    await act(async () => {
      result.current.selectImageGroupPreviewItem('image-b');
      await flushMicrotasks();
    });

    expect(result.current.activeImageGroupPreviewId).toBe('image-b');
    expect(result.current.imageGroupPreviewItems).toEqual([
      {
        id: 'image-a',
        thumbnailUrl: null,
        previewUrl: null,
        stageUrls: [],
        fullPreviewUrl: null,
        previewName: 'A.png',
      },
      {
        id: 'image-b',
        thumbnailUrl:
          'https://example.com/storage/v1/object/sign/chat/images/channel/b.png',
        previewUrl:
          'https://example.com/storage/v1/object/sign/chat/images/channel/b.png',
        stageUrls: [],
        fullPreviewUrl:
          'https://example.com/storage/v1/object/sign/chat/images/channel/b.png',
        previewName: 'B.png',
      },
    ]);

    await act(async () => {
      resolveFirstImageUrl?.(
        'https://example.com/storage/v1/object/sign/chat/images/channel/a.png'
      );
      await flushMicrotasks();
    });
  });

  it('hydrates grouped image thumbnails from the persisted preview cache before resolving full assets', async () => {
    mockLoadPersistedImagePreviewEntriesByMessageIds.mockResolvedValue([
      {
        messageId: 'image-a',
        preview: {
          previewUrl: 'data:image/webp;base64,cGVyc2lzdGVkLXRodW1iLWE=',
          isObjectUrl: false,
        },
      },
      {
        messageId: 'image-b',
        preview: {
          previewUrl: 'data:image/webp;base64,cGVyc2lzdGVkLXRodW1iLWI=',
          isObjectUrl: false,
        },
      },
    ]);

    const { result } = renderHook(() => useMessagesPanePreviews());

    await act(async () => {
      await result.current.openImageGroupInPortal(
        [
          {
            id: 'image-a',
            message: 'images/channel/a.png',
            file_storage_path: 'images/channel/a.png',
            file_mime_type: 'image/png',
            file_name: 'A.png',
            file_preview_url: 'previews/channel/a.webp',
          },
          {
            id: 'image-b',
            message: 'images/channel/b.png',
            file_storage_path: 'images/channel/b.png',
            file_mime_type: 'image/png',
            file_name: 'B.png',
            file_preview_url: 'previews/channel/b.webp',
          },
        ],
        'image-a'
      );
    });

    expect(
      mockLoadPersistedImagePreviewEntriesByMessageIds
    ).toHaveBeenCalledWith(['image-a', 'image-b']);
    expect(result.current.imageGroupPreviewItems).toEqual([
      {
        id: 'image-a',
        thumbnailUrl: 'data:image/webp;base64,cGVyc2lzdGVkLXRodW1iLWE=',
        previewUrl: 'blob:chat-image-preview',
        stageUrls: [],
        fullPreviewUrl: 'blob:chat-image-preview',
        previewName: 'A.png',
      },
      {
        id: 'image-b',
        thumbnailUrl: 'data:image/webp;base64,cGVyc2lzdGVkLXRodW1iLWI=',
        previewUrl: 'blob:chat-image-preview',
        stageUrls: [],
        fullPreviewUrl: 'blob:chat-image-preview',
        previewName: 'B.png',
      },
    ]);
  });

  it('does not reuse a storage-backed bubble preview while full resolution is still resolving', async () => {
    let resolveFullImageUrl: ((value: string | null) => void) | null = null;
    mockResolveChatAssetUrl.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveFullImageUrl = resolve;
        })
    );

    const { result } = renderHook(() => useMessagesPanePreviews());

    let openPreviewPromise: Promise<void> | null = null;

    act(() => {
      openPreviewPromise = result.current.openImageInPortal(
        {
          id: 'image-no-stage-1',
          message: 'images/channel/a.png',
          file_storage_path: 'images/channel/a.png',
          file_mime_type: 'image/png',
          file_preview_url: 'previews/channel/a.webp',
        },
        'Lampiran',
        'data:image/webp;base64,cHJldmlldw=='
      );
    });

    expect(result.current.isImagePreviewOpen).toBe(true);
    expect(result.current.isImagePreviewVisible).toBe(true);
    expect(result.current.imagePreviewUrl).toBeNull();
    expect(result.current.imagePreviewBackdropUrl).toBeNull();
    expect(result.current.imagePreviewStageUrls).toEqual([]);

    await act(async () => {
      resolveFullImageUrl?.('https://example.com/full/a.png');
      await openPreviewPromise;
    });

    expect(result.current.imagePreviewUrl).toBe(
      'https://example.com/full/a.png'
    );
    expect(result.current.imagePreviewStageUrls).toEqual([]);
  });

  it('reuses an aspect-preserving storage-backed bubble preview while full resolution is still resolving', async () => {
    let resolveFullImageUrl: ((value: string | null) => void) | null = null;
    mockResolveChatAssetUrl.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveFullImageUrl = resolve;
        })
    );

    const { result } = renderHook(() => useMessagesPanePreviews());

    let openPreviewPromise: Promise<void> | null = null;

    act(() => {
      openPreviewPromise = result.current.openImageInPortal(
        {
          id: 'image-fit-preview-1',
          message: 'images/channel/b.png',
          file_storage_path: 'images/channel/b.png',
          file_mime_type: 'image/png',
          file_preview_url: 'previews/channel/b.fit-v2.webp',
        },
        'Lampiran',
        'data:image/webp;base64,YXNwZWN0LXByZXZpZXc='
      );
    });

    expect(result.current.isImagePreviewOpen).toBe(true);
    expect(result.current.isImagePreviewVisible).toBe(true);
    expect(result.current.imagePreviewUrl).toBeNull();
    expect(result.current.imagePreviewBackdropUrl).toBe(
      'data:image/webp;base64,YXNwZWN0LXByZXZpZXc='
    );

    await act(async () => {
      resolveFullImageUrl?.('https://example.com/full/b.png');
      await openPreviewPromise;
    });

    expect(result.current.imagePreviewUrl).toBe(
      'https://example.com/full/b.png'
    );
  });

  it('prefers the reusable bubble preview before the cached in-memory expand stage', () => {
    mockResolveChatAssetUrl.mockImplementation(() => new Promise(() => {}));
    chatRuntimeCache.imagePreviews.setExpandStage(
      'image-stage-1',
      'data:image/webp;base64,ZXhwYW5kLXN0YWdl'
    );

    const { result } = renderHook(() => useMessagesPanePreviews());

    act(() => {
      void result.current.openImageInPortal(
        {
          id: 'image-stage-1',
          message: 'images/channel/staged.png',
          file_storage_path: 'images/channel/staged.png',
          file_mime_type: 'image/png',
          file_preview_url: 'previews/channel/staged.fit-v2.webp',
        },
        'Lampiran',
        'data:image/webp;base64,YnViYmxlLXByZXZpZXc='
      );
    });

    expect(result.current.imagePreviewBackdropUrl).toBe(
      'data:image/webp;base64,YnViYmxlLXByZXZpZXc='
    );
    expect(result.current.imagePreviewUrl).toBeNull();
  });

  it('falls back to the cached in-memory expand stage when no reusable bubble preview exists', () => {
    mockResolveChatAssetUrl.mockImplementation(() => new Promise(() => {}));
    chatRuntimeCache.imagePreviews.setExpandStage(
      'image-stage-fallback-1',
      'data:image/webp;base64,ZXhwYW5kLXN0YWdl'
    );

    const { result } = renderHook(() => useMessagesPanePreviews());

    act(() => {
      void result.current.openImageInPortal(
        {
          id: 'image-stage-fallback-1',
          message: 'images/channel/staged-fallback.png',
          file_storage_path: 'images/channel/staged-fallback.png',
          file_mime_type: 'image/png',
          file_preview_url: null,
        },
        'Lampiran'
      );
    });

    expect(result.current.imagePreviewBackdropUrl).toBe(
      'data:image/webp;base64,ZXhwYW5kLXN0YWdl'
    );
    expect(result.current.imagePreviewUrl).toBeNull();
  });

  it('drops stale cached expand stages that were generated at an older target size', () => {
    mockResolveChatAssetUrl.mockImplementation(() => new Promise(() => {}));
    imageExpandStageStore.set('image-stage-stale-1', {
      previewUrl: 'data:image/webp;base64,c3RhbGUtc3RhZ2U=',
      targetSize: Math.max(1, Math.round(IMAGE_EXPAND_STAGE_TARGET_SIZE * 0.5)),
    });

    const { result } = renderHook(() => useMessagesPanePreviews());

    act(() => {
      void result.current.openImageInPortal(
        {
          id: 'image-stage-stale-1',
          message: 'images/channel/staged-stale.png',
          file_storage_path: 'images/channel/staged-stale.png',
          file_mime_type: 'image/png',
          file_preview_url: null,
        },
        'Lampiran'
      );
    });

    expect(result.current.imagePreviewBackdropUrl).toBeNull();
    expect(
      chatRuntimeCache.imagePreviews.getExpandStage('image-stage-stale-1')
    ).toBeNull();
  });

  it('reuses the current signed bubble image immediately while the full image is re-resolving', async () => {
    let resolveFullImageUrl: ((value: string | null) => void) | null = null;
    mockResolveChatAssetUrl.mockImplementation(
      () =>
        new Promise(resolve => {
          resolveFullImageUrl = resolve;
        })
    );

    const { result } = renderHook(() => useMessagesPanePreviews());

    let openPreviewPromise: Promise<void> | null = null;

    act(() => {
      openPreviewPromise = result.current.openImageInPortal(
        {
          id: 'image-signed-preview-1',
          message: 'images/channel/c.png',
          file_storage_path: 'images/channel/c.png',
          file_mime_type: 'image/png',
          file_preview_url: null,
        },
        'Lampiran',
        'https://example.com/storage/v1/object/sign/chat/images/channel/c.png'
      );
    });

    expect(result.current.imagePreviewBackdropUrl).toBe(
      'https://example.com/storage/v1/object/sign/chat/images/channel/c.png'
    );
    expect(result.current.imagePreviewUrl).toBeNull();

    await act(async () => {
      resolveFullImageUrl?.(
        'https://example.com/storage/v1/object/sign/chat/images/channel/c-full.png'
      );
      await openPreviewPromise;
    });

    expect(result.current.imagePreviewUrl).toBe(
      'https://example.com/storage/v1/object/sign/chat/images/channel/c-full.png'
    );
  });

  it('opens document previews from a resolved signed asset url before downloading blobs', async () => {
    mockResolveChatAssetUrl.mockResolvedValue(
      'https://example.com/storage/v1/object/sign/chat/documents/channel/report.pdf'
    );

    const { result } = renderHook(() => useMessagesPanePreviews());

    await act(async () => {
      await result.current.openDocumentInPortal(
        {
          message: 'documents/channel/report.pdf',
          file_storage_path: 'documents/channel/report.pdf',
        },
        'Report.pdf',
        true
      );
    });

    expect(mockOpenDocumentPreview).toHaveBeenCalledTimes(1);

    const [previewRequest] = mockOpenDocumentPreview.mock.calls[0];
    await expect(previewRequest.resolvePreviewUrl()).resolves.toEqual({
      previewUrl:
        'https://example.com/storage/v1/object/sign/chat/documents/channel/report.pdf',
      revokeOnClose: false,
    });
    expect(mockResolveChatAssetUrl).toHaveBeenCalledWith(
      'documents/channel/report.pdf',
      'documents/channel/report.pdf'
    );
    expect(mockFetchPdfBlobWithFallback).not.toHaveBeenCalled();
    expect(mockFetchChatFileBlobWithFallback).not.toHaveBeenCalled();
  });
});
