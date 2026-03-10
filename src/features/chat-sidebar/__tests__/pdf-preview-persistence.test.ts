import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../../services/api/chat.service';
import {
  queuePersistedPdfPreview,
  resetQueuedPdfPreviewJobs,
} from '../utils/pdf-preview-persistence';

const { mockGateway, mockRenderPdfPreviewBlob } = vi.hoisted(() => ({
  mockGateway: {
    updateFilePreview: vi.fn(),
    uploadRawFile: vi.fn(),
    deleteFile: vi.fn(),
  },
  mockRenderPdfPreviewBlob: vi.fn(),
}));

vi.mock('@/services/api/chat.service', () => ({
  chatMessagesService: {
    updateFilePreview: mockGateway.updateFilePreview,
  },
}));

vi.mock('@/services/api/storage.service', () => ({
  StorageService: mockGateway,
}));

vi.mock('../utils/pdf-preview', () => ({
  renderPdfPreviewBlob: mockRenderPdfPreviewBlob,
}));

const buildMessage = (
  overrides: Partial<
    Pick<
      ChatMessage,
      | 'id'
      | 'message'
      | 'message_type'
      | 'file_name'
      | 'file_mime_type'
      | 'file_preview_url'
      | 'file_preview_status'
      | 'file_storage_path'
    >
  > = {}
) => ({
  id: overrides.id ?? 'message-1',
  message: overrides.message ?? 'documents/channel/report.pdf',
  message_type: overrides.message_type ?? 'file',
  file_name: overrides.file_name ?? 'report.pdf',
  file_mime_type: overrides.file_mime_type ?? 'application/pdf',
  file_preview_url: overrides.file_preview_url ?? null,
  file_preview_status: overrides.file_preview_status ?? null,
  file_storage_path:
    overrides.file_storage_path ?? 'documents/channel/report.pdf',
});

describe('pdf-preview-persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetQueuedPdfPreviewJobs();
    mockGateway.updateFilePreview.mockResolvedValue({
      data: null,
      error: null,
    });
    mockGateway.uploadRawFile.mockResolvedValue({
      path: 'previews/channel/report.png',
      publicUrl: 'https://example.com/previews/channel/report.png',
    });
    mockGateway.deleteFile.mockResolvedValue(undefined);
  });

  it('persists preview metadata for committed PDF messages', async () => {
    mockRenderPdfPreviewBlob.mockResolvedValue({
      coverBlob: new Blob(['png'], { type: 'image/png' }),
      pageCount: 4,
    });

    const didQueue = queuePersistedPdfPreview({
      message: buildMessage(),
      file: new File(['pdf'], 'report.pdf', {
        type: 'application/pdf',
      }),
    });

    expect(didQueue).toBe(true);

    await waitFor(() => {
      expect(mockGateway.updateFilePreview).toHaveBeenCalledTimes(2);
    });

    expect(mockGateway.updateFilePreview).toHaveBeenNthCalledWith(
      1,
      'message-1',
      {
        file_preview_url: null,
        file_preview_page_count: null,
        file_preview_status: 'pending',
        file_preview_error: null,
      }
    );
    expect(mockGateway.uploadRawFile).toHaveBeenCalledWith(
      'chat',
      expect.any(File),
      'previews/channel/report.png',
      'image/png'
    );
    expect(mockGateway.updateFilePreview).toHaveBeenNthCalledWith(
      2,
      'message-1',
      {
        file_preview_url: 'previews/channel/report.png',
        file_preview_page_count: 4,
        file_preview_status: 'ready',
        file_preview_error: null,
      }
    );
  });

  it('records a failed preview state when rendering the PDF preview fails', async () => {
    mockRenderPdfPreviewBlob.mockResolvedValue(null);

    queuePersistedPdfPreview({
      message: buildMessage({
        id: 'message-2',
        file_storage_path: 'documents/channel/broken.pdf',
      }),
      file: new File(['pdf'], 'broken.pdf', {
        type: 'application/pdf',
      }),
    });

    await waitFor(() => {
      expect(mockGateway.updateFilePreview).toHaveBeenCalledTimes(2);
    });

    expect(mockGateway.uploadRawFile).not.toHaveBeenCalled();
    expect(mockGateway.updateFilePreview).toHaveBeenNthCalledWith(
      2,
      'message-2',
      {
        file_preview_url: null,
        file_preview_page_count: null,
        file_preview_status: 'failed',
        file_preview_error: 'Preview dokumen tidak dapat dirender',
      }
    );
  });
});
