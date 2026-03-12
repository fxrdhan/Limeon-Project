import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessagesPanePreviews } from '../hooks/useMessagesPanePreviews';

const {
  mockFetchChatFileBlobWithFallback,
  mockFetchPdfBlobWithFallback,
  mockOpenDocumentPreview,
  mockResolveChatAssetUrl,
} = vi.hoisted(() => ({
  mockFetchChatFileBlobWithFallback: vi.fn(),
  mockFetchPdfBlobWithFallback: vi.fn(),
  mockOpenDocumentPreview: vi.fn(),
  mockResolveChatAssetUrl: vi.fn(),
}));

vi.mock('../utils/message-file', () => ({
  fetchChatFileBlobWithFallback: mockFetchChatFileBlobWithFallback,
  fetchPdfBlobWithFallback: mockFetchPdfBlobWithFallback,
  isDirectChatAssetUrl: vi.fn(() => false),
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
  let createObjectURLMock: ReturnType<typeof vi.spyOn>;
  let revokeObjectURLMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockResolveChatAssetUrl.mockResolvedValue(null);
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
          message:
            'https://example.com/storage/v1/object/sign/chat/images/channel/a.png',
          file_storage_path: 'images/channel/a.png',
          file_mime_type: 'image/png',
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
    expect(result.current.imagePreviewUrl).toBe('blob:chat-image-preview');
    expect(result.current.imagePreviewName).toBe('Lampiran');
    expect(result.current.isImagePreviewVisible).toBe(true);

    act(() => {
      result.current.closeImagePreview();
      vi.advanceTimersByTime(150);
    });

    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:chat-image-preview');
    expect(result.current.imagePreviewUrl).toBeNull();
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
