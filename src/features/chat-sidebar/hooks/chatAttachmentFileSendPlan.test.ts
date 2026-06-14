import { describe, expect, it } from 'vite-plus/test';
import type { ChatMessage } from '../data/chatSidebarGateway';
import type { PendingComposerFile } from '../types';
import {
  buildFileAttachmentMetadata,
  buildFilePreviewSyncMessage,
  buildInitialFilePreviewFields,
  getFileAttachmentSendFailureToast,
  resolvePendingFileWithPreparedPdfPreview,
} from './chatAttachmentFileSendPlan';

const pendingFile = (
  overrides: Partial<PendingComposerFile> = {}
): PendingComposerFile => ({
  file: new File(['attachment'], 'invoice.pdf', {
    type: 'application/pdf',
  }),
  fileName: 'invoice.pdf',
  fileTypeLabel: 'PDF',
  fileKind: 'document',
  mimeType: 'application/pdf',
  pdfCoverUrl: null,
  pdfPageCount: null,
  ...overrides,
});

const message = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: 'message-1',
  sender_id: 'sender-old',
  receiver_id: 'receiver-1',
  channel_id: 'channel-1',
  message: 'storage/original.pdf',
  message_type: 'file',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_read: false,
  reply_to_id: null,
  ...overrides,
});

describe('chat attachment file send plan helpers', () => {
  it('builds shared file attachment metadata from a pending file', () => {
    const file = pendingFile({
      fileKind: 'audio',
      fileName: 'voice.webm',
      mimeType: 'audio/webm',
      file: new File(['audio'], 'voice.webm', { type: 'audio/webm' }),
    });

    expect(buildFileAttachmentMetadata(file, 'chat/audio/voice.webm')).toEqual({
      file_name: 'voice.webm',
      file_kind: 'audio',
      file_mime_type: 'audio/webm',
      file_size: file.file.size,
      file_storage_path: 'chat/audio/voice.webm',
    });
  });

  it('uses file kind specific send failure labels', () => {
    expect(getFileAttachmentSendFailureToast('audio')).toBe(
      'Gagal mengirim audio'
    );
    expect(getFileAttachmentSendFailureToast('document')).toBe(
      'Gagal mengirim dokumen'
    );
  });

  it('builds initial preview failure fields only for previewable files', () => {
    expect(
      buildInitialFilePreviewFields({
        shouldPersistImagePreview: false,
        shouldPersistPdfPreview: false,
      })
    ).toBeNull();

    expect(
      buildInitialFilePreviewFields({
        shouldPersistImagePreview: true,
        shouldPersistPdfPreview: false,
      })
    ).toMatchObject({
      file_preview_status: 'failed',
      file_preview_error: 'Thumbnail gambar tidak tersedia',
    });

    expect(
      buildInitialFilePreviewFields({
        shouldPersistImagePreview: false,
        shouldPersistPdfPreview: true,
      })
    ).toMatchObject({
      file_preview_status: 'failed',
      file_preview_error: 'Preview dokumen tidak tersedia',
    });
  });

  it('fills missing PDF preview details from prepared previews without replacing existing values', () => {
    expect(
      resolvePendingFileWithPreparedPdfPreview(pendingFile(), {
        coverDataUrl: 'data:image/png;base64,cover',
        pageCount: 3,
      })
    ).toMatchObject({
      pdfCoverUrl: 'data:image/png;base64,cover',
      pdfPageCount: 3,
    });

    expect(
      resolvePendingFileWithPreparedPdfPreview(
        pendingFile({
          pdfCoverUrl: 'data:image/png;base64,existing',
          pdfPageCount: 2,
        }),
        {
          coverDataUrl: 'data:image/png;base64,prepared',
          pageCount: 4,
        }
      )
    ).toMatchObject({
      pdfCoverUrl: 'data:image/png;base64,existing',
      pdfPageCount: 2,
    });
  });

  it('preserves prior nullish fallback behavior for empty PDF cover urls', () => {
    expect(
      resolvePendingFileWithPreparedPdfPreview(
        pendingFile({
          pdfCoverUrl: '',
          pdfPageCount: null,
        }),
        {
          coverDataUrl: 'data:image/png;base64,prepared',
          pageCount: 4,
        }
      )
    ).toMatchObject({
      pdfCoverUrl: '',
      pdfPageCount: 4,
    });
  });

  it('builds real message payloads for preview sync', () => {
    expect(
      buildFilePreviewSyncMessage({
        realMessage: message({
          file_storage_path: null,
        }),
        pendingFile: pendingFile({
          fileName: 'invoice.pdf',
          mimeType: 'application/pdf',
        }),
        filePath: 'chat/files/invoice.pdf',
        senderId: 'user-1',
      })
    ).toMatchObject({
      sender_id: 'user-1',
      file_name: 'invoice.pdf',
      file_mime_type: 'application/pdf',
      file_storage_path: 'chat/files/invoice.pdf',
    });
  });
});
