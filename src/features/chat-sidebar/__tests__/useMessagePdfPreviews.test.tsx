import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { ChatMessage } from '../../../services/api/chat.service';
import { useMessagePdfPreviews } from '../hooks/useMessagePdfPreviews';
import { chatRuntimeCache } from '../utils/chatRuntimeCache';

const {
  mockFetchChatFileBlobWithFallback,
  mockFetchPdfBlobWithFallback,
  mockRenderPdfPreviewDataUrl,
} = vi.hoisted(() => ({
  mockFetchChatFileBlobWithFallback: vi.fn(),
  mockFetchPdfBlobWithFallback: vi.fn(),
  mockRenderPdfPreviewDataUrl: vi.fn(),
}));

vi.mock('../utils/message-file', async () => {
  const actual = await vi.importActual('../utils/message-file');
  return {
    ...actual,
    fetchChatFileBlobWithFallback: mockFetchChatFileBlobWithFallback,
    fetchPdfBlobWithFallback: mockFetchPdfBlobWithFallback,
  };
});

vi.mock('../utils/pdf-preview', () => ({
  renderPdfPreviewDataUrl: mockRenderPdfPreviewDataUrl,
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
    mockFetchPdfBlobWithFallback.mockResolvedValue(null);
    mockRenderPdfPreviewDataUrl.mockResolvedValue(null);
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
});
