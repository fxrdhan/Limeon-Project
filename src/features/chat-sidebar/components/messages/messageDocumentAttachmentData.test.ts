import { describe, expect, it, vi } from 'vite-plus/test';
import type { ChatMessage } from '../../data/chatSidebarGateway';
import type { PdfMessagePreview } from '../../utils/pdf-message-preview';
import { getDocumentAttachmentData } from './messageDocumentAttachmentData';

const message = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'message-1',
  sender_id: 'sender-1',
  receiver_id: 'receiver-1',
  channel_id: 'channel-1',
  message: 'storage/documents/invoice.pdf',
  message_type: 'file',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_read: false,
  reply_to_id: null,
  file_mime_type: 'application/pdf',
  file_size: 2048,
  ...overrides,
});

const cachedPdfPreview = (): PdfMessagePreview => ({
  coverDataUrl: 'data:image/png;base64,cached',
  pageCount: 1,
  cacheKey: 'pdf-cache-key',
});

describe('document attachment metadata', () => {
  it('uses direct persisted PDF preview urls before cached previews', () => {
    const getPdfMessagePreview = vi.fn(() => cachedPdfPreview());

    expect(
      getDocumentAttachmentData({
        fileName: 'invoice.pdf',
        getPdfMessagePreview,
        message: message({
          file_preview_url: '/chat-previews/invoice.webp',
        }),
      })
    ).toMatchObject({
      fileExtension: 'pdf',
      fileSecondaryLabel: 'PDF · 2.00 KB',
      isImageFile: false,
      isPdfFile: true,
      resolvedPdfPreviewUrl: '/chat-previews/invoice.webp',
    });
    expect(getPdfMessagePreview).not.toHaveBeenCalled();
  });

  it('falls back to cached PDF previews when persisted urls are storage paths', () => {
    expect(
      getDocumentAttachmentData({
        fileName: 'invoice.pdf',
        getPdfMessagePreview: () => cachedPdfPreview(),
        message: message({
          file_preview_url: 'chat-previews/invoice.webp',
        }),
      }).resolvedPdfPreviewUrl
    ).toBe('data:image/png;base64,cached');
  });

  it('detects image document attachments without PDF preview resolution', () => {
    const getPdfMessagePreview = vi.fn(() => cachedPdfPreview());

    expect(
      getDocumentAttachmentData({
        fileName: 'photo.webp',
        getPdfMessagePreview,
        message: message({
          file_mime_type: 'image/webp',
          file_preview_url: '/chat-previews/photo.webp',
          file_size: 15360,
          message: 'storage/images/photo.webp',
        }),
      })
    ).toMatchObject({
      fileExtension: 'webp',
      fileSecondaryLabel: 'WEBP · 15.0 KB',
      isImageFile: true,
      isPdfFile: false,
      resolvedPdfPreviewUrl: null,
    });
    expect(getPdfMessagePreview).not.toHaveBeenCalled();
  });
});
