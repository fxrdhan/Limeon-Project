import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useMessagePdfPreviews } from '../hooks/useMessagePdfPreviews';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';
import { buildPdfMessagePreviewCacheKey } from '../utils/pdf-message-preview';

const {
  mockFetchChatFileBlobWithFallback,
  mockFetchPdfBlobWithFallback,
  mockRenderPdfPreviewDataUrl,
  mockLoadPersistedPdfPreviewEntry,
  mockResolveChatAssetUrl,
} = vi.hoisted(() => ({
  mockFetchChatFileBlobWithFallback: vi.fn(),
  mockFetchPdfBlobWithFallback: vi.fn(),
  mockRenderPdfPreviewDataUrl: vi.fn(),
  mockLoadPersistedPdfPreviewEntry: vi.fn(),
  mockResolveChatAssetUrl: vi.fn(),
}));

vi.mock('../utils/message-file', async () => {
  const actual = await vi.importActual('../utils/message-file');
  return {
    ...actual,
    fetchChatFileBlobWithFallback: mockFetchChatFileBlobWithFallback,
    fetchPdfBlobWithFallback: mockFetchPdfBlobWithFallback,
    resolveChatAssetUrl: mockResolveChatAssetUrl,
  };
});

vi.mock('../utils/pdf-preview', () => ({
  renderPdfPreviewDataUrl: mockRenderPdfPreviewDataUrl,
}));

vi.mock('../utils/pdf-preview-persistence', () => ({
  loadPersistedPdfPreviewEntry: mockLoadPersistedPdfPreviewEntry,
}));

const buildMessage = (overrides: Partial<ChatMessage>): ChatMessage => ({
  id: overrides.id ?? 'file-1',
  sender_id: overrides.sender_id ?? 'user-a',
  receiver_id: overrides.receiver_id ?? 'user-b',
  channel_id: overrides.channel_id ?? 'channel-1',
  message: overrides.message ?? 'documents/channel/report.pdf',
  message_type: overrides.message_type ?? 'file',
  created_at: overrides.created_at ?? '2026-03-08T10:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-03-08T10:00:00.000Z',
  is_read: overrides.is_read ?? false,
  is_delivered: overrides.is_delivered ?? false,
  reply_to_id: overrides.reply_to_id ?? null,
  file_name: overrides.file_name ?? 'report.pdf',
  file_kind: overrides.file_kind ?? 'document',
  file_mime_type: overrides.file_mime_type ?? 'application/pdf',
  file_size: overrides.file_size ?? 2048,
  file_storage_path:
    overrides.file_storage_path ?? 'documents/channel/report.pdf',
  file_preview_url: overrides.file_preview_url ?? 'previews/channel/report.png',
  file_preview_page_count: overrides.file_preview_page_count ?? 3,
  file_preview_status: overrides.file_preview_status ?? 'ready',
  file_preview_error: overrides.file_preview_error ?? null,
  message_relation_kind: overrides.message_relation_kind ?? null,
  sender_name: overrides.sender_name,
  receiver_name: overrides.receiver_name,
  stableKey: overrides.stableKey,
});

describe('useMessagePdfPreviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatRuntimeCache.pdfPreviews.reset();
    mockLoadPersistedPdfPreviewEntry.mockResolvedValue(null);
    mockFetchPdfBlobWithFallback.mockResolvedValue(null);
    mockRenderPdfPreviewDataUrl.mockResolvedValue(null);
    mockResolveChatAssetUrl.mockResolvedValue(null);
  });

  it('loads cached persistent PDF previews before checking storage or rerendering the PDF', async () => {
    const message = buildMessage({
      file_preview_url: null,
      file_preview_page_count: null,
      file_preview_status: null,
    });
    mockLoadPersistedPdfPreviewEntry.mockResolvedValue({
      messageId: message.id,
      preview: {
        cacheKey: buildPdfMessagePreviewCacheKey(
          {
            id: message.id,
            message: message.message,
            message_type: message.message_type,
            file_name: message.file_name,
            file_mime_type: message.file_mime_type,
            file_preview_url: message.file_preview_url,
            file_preview_page_count: message.file_preview_page_count,
            file_preview_status: message.file_preview_status,
            file_storage_path: message.file_storage_path,
            file_size: message.file_size,
          },
          'report.pdf'
        ),
        coverDataUrl: 'data:image/png;base64,persistedpreview',
        pageCount: 5,
      },
    });

    const { result } = renderHook(() =>
      useMessagePdfPreviews({
        messages: [message],
        getAttachmentFileName: currentMessage =>
          currentMessage.file_name || 'Lampiran',
        getAttachmentFileKind: () => 'document',
      })
    );

    await waitFor(() => {
      const preview = result.current.getPdfMessagePreview(
        message,
        'report.pdf'
      );
      expect(preview?.pageCount).toBe(5);
      expect(preview?.coverDataUrl).toBe(
        'data:image/png;base64,persistedpreview'
      );
    });

    expect(mockFetchChatFileBlobWithFallback).not.toHaveBeenCalled();
    expect(mockFetchPdfBlobWithFallback).not.toHaveBeenCalled();
    expect(mockRenderPdfPreviewDataUrl).not.toHaveBeenCalled();
  });

  it('loads persisted path-based PDF previews from storage instead of rerendering the PDF', async () => {
    mockFetchChatFileBlobWithFallback.mockResolvedValue(
      new Blob(['preview-image'], { type: 'image/png' })
    );

    const message = buildMessage({});
    const { result } = renderHook(() =>
      useMessagePdfPreviews({
        messages: [message],
        getAttachmentFileName: currentMessage =>
          currentMessage.file_name || 'Lampiran',
        getAttachmentFileKind: () => 'document',
      })
    );

    await waitFor(() => {
      const preview = result.current.getPdfMessagePreview(
        message,
        'report.pdf'
      );
      expect(preview?.pageCount).toBe(3);
      expect(preview?.coverDataUrl).toMatch(/^data:image\/png;base64,/);
    });

    expect(mockFetchChatFileBlobWithFallback).toHaveBeenCalledWith(
      'previews/channel/report.png',
      'previews/channel/report.png',
      'image/png'
    );
    expect(mockFetchPdfBlobWithFallback).not.toHaveBeenCalled();
    expect(mockRenderPdfPreviewDataUrl).not.toHaveBeenCalled();
  });

  it('uses a resolved preview asset url while the preview blob hydration is still pending', async () => {
    let resolvePreviewBlob: ((value: Blob | null) => void) | null = null;
    mockResolveChatAssetUrl.mockResolvedValue(
      'https://signed.example/previews/channel/report.png'
    );
    mockFetchChatFileBlobWithFallback.mockImplementation(
      async () =>
        await new Promise<Blob | null>(resolve => {
          resolvePreviewBlob = resolve;
        })
    );

    const message = buildMessage({});
    const { result } = renderHook(() =>
      useMessagePdfPreviews({
        messages: [message],
        getAttachmentFileName: currentMessage =>
          currentMessage.file_name || 'Lampiran',
        getAttachmentFileKind: () => 'document',
      })
    );

    await waitFor(() => {
      const preview = result.current.getPdfMessagePreview(
        message,
        'report.pdf'
      );
      expect(preview?.coverDataUrl).toBe(
        'https://signed.example/previews/channel/report.png'
      );
      expect(preview?.pageCount).toBe(3);
    });

    expect(resolvePreviewBlob).not.toBeNull();
    expect(mockFetchPdfBlobWithFallback).not.toHaveBeenCalled();
    expect(mockRenderPdfPreviewDataUrl).not.toHaveBeenCalled();
  });

  it('warms multiple PDF attachment previews in parallel without blocking on one slow item', async () => {
    let resolveSlowPreviewBlob: ((value: Blob | null) => void) | null = null;

    mockFetchChatFileBlobWithFallback.mockImplementation(
      async (previewPath?: string) => {
        if (previewPath === 'previews/channel/report-new.png') {
          return new Blob(['new-preview'], { type: 'image/png' });
        }

        if (previewPath === 'previews/channel/report-middle.png') {
          return await new Promise<Blob | null>(resolve => {
            resolveSlowPreviewBlob = resolve;
          });
        }

        if (previewPath === 'previews/channel/report-old.png') {
          return new Blob(['old-preview'], { type: 'image/png' });
        }

        return null;
      }
    );

    const oldestMessage = buildMessage({
      id: 'file-old',
      created_at: '2026-03-08T10:00:00.000Z',
      updated_at: '2026-03-08T10:00:00.000Z',
      file_preview_url: 'previews/channel/report-old.png',
    });
    const middleMessage = buildMessage({
      id: 'file-middle',
      created_at: '2026-03-08T10:01:00.000Z',
      updated_at: '2026-03-08T10:01:00.000Z',
      file_preview_url: 'previews/channel/report-middle.png',
    });
    const newestMessage = buildMessage({
      id: 'file-new',
      created_at: '2026-03-08T10:02:00.000Z',
      updated_at: '2026-03-08T10:02:00.000Z',
      file_preview_url: 'previews/channel/report-new.png',
    });

    const { result } = renderHook(() =>
      useMessagePdfPreviews({
        messages: [oldestMessage, middleMessage, newestMessage],
        getAttachmentFileName: currentMessage =>
          currentMessage.file_name || 'Lampiran',
        getAttachmentFileKind: () => 'document',
      })
    );

    await waitFor(() => {
      const newestPreview = result.current.getPdfMessagePreview(
        newestMessage,
        'report.pdf'
      );
      expect(newestPreview?.coverDataUrl).toMatch(/^data:image\/png;base64,/);
    });

    await waitFor(() => {
      const oldestPreview = result.current.getPdfMessagePreview(
        oldestMessage,
        'report.pdf'
      );
      expect(oldestPreview?.coverDataUrl).toMatch(/^data:image\/png;base64,/);
    });

    expect(
      result.current.getPdfMessagePreview(middleMessage, 'report.pdf')
    ).toBeUndefined();
    expect(resolveSlowPreviewBlob).not.toBeNull();
  });
});
