import { describe, expect, it, vi } from 'vite-plus/test';
import {
  persistPdfPreview,
  type ChatPdfPreviewMessageRecord,
  type ChatPdfPreviewRepository,
} from './actions.ts';

const USER_ID = 'user-1';
const MESSAGE_ID = 'message-1';
const PNG_PREVIEW_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1,
]);

const buildPdfMessage = (
  overrides: Partial<ChatPdfPreviewMessageRecord> = {}
): ChatPdfPreviewMessageRecord => ({
  id: overrides.id ?? MESSAGE_ID,
  sender_id: overrides.sender_id ?? USER_ID,
  message: overrides.message ?? 'documents/channel/user-1_report.pdf',
  message_type: overrides.message_type ?? 'file',
  file_name: overrides.file_name ?? 'report.pdf',
  file_mime_type: overrides.file_mime_type ?? 'application/pdf',
  file_storage_path:
    'file_storage_path' in overrides
      ? (overrides.file_storage_path ?? null)
      : 'documents/channel/user-1_report.pdf',
  file_preview_url:
    'file_preview_url' in overrides
      ? (overrides.file_preview_url ?? null)
      : null,
  file_preview_status:
    'file_preview_status' in overrides
      ? (overrides.file_preview_status ?? null)
      : null,
  file_preview_page_count:
    'file_preview_page_count' in overrides
      ? (overrides.file_preview_page_count ?? null)
      : null,
  file_preview_error:
    'file_preview_error' in overrides
      ? (overrides.file_preview_error ?? null)
      : null,
});

const createRepository = (
  overrides: {
    message?: ChatPdfPreviewMessageRecord | null;
    messageError?: string | null;
    updateError?: string | null;
    updatedMessage?: ChatPdfPreviewMessageRecord | null;
    uploadError?: string | null;
  } = {}
) => {
  const repository: ChatPdfPreviewRepository = {
    getOwnedPdfMessage: vi.fn(async () => ({
      message: overrides.message ?? buildPdfMessage(),
      error: overrides.messageError ?? null,
    })),
    updatePreviewMetadata: vi.fn(async () => ({
      message: overrides.updatedMessage ?? buildPdfMessage(),
      error: overrides.updateError ?? null,
    })),
    uploadPreviewAsset: vi.fn(async () => ({
      error: overrides.uploadError ?? null,
    })),
    deletePreviewAsset: vi.fn(async () => {}),
  };

  return repository;
};

describe('chat-pdf-preview actions', () => {
  it('persists a PDF preview asset and marks the message ready', async () => {
    const repository = createRepository({
      updatedMessage: buildPdfMessage({
        file_preview_url: 'previews/channel/user-1_report.png',
        file_preview_status: 'ready',
        file_preview_page_count: 2,
      }),
    });
    const previewBytes = PNG_PREVIEW_BYTES;

    const result = await persistPdfPreview({
      repository,
      userId: USER_ID,
      messageId: MESSAGE_ID,
      previewBytes,
      pageCount: 2,
    });

    expect(result.status).toBe(200);
    expect(
      'previewPersisted' in result.body && result.body.previewPersisted
    ).toBe(true);
    expect(repository.uploadPreviewAsset).toHaveBeenCalledWith(
      'previews/channel/user-1_report.png',
      previewBytes
    );
    expect(repository.updatePreviewMetadata).toHaveBeenNthCalledWith(
      1,
      MESSAGE_ID,
      {
        file_preview_url: null,
        file_preview_page_count: null,
        file_preview_status: 'pending',
        file_preview_error: null,
      }
    );
    expect(repository.updatePreviewMetadata).toHaveBeenNthCalledWith(
      2,
      MESSAGE_ID,
      {
        file_preview_url: 'previews/channel/user-1_report.png',
        file_preview_page_count: 2,
        file_preview_status: 'ready',
        file_preview_error: null,
      }
    );
  });

  it('reuses an already ready preview without uploading again', async () => {
    const readyMessage = buildPdfMessage({
      file_preview_url: 'previews/channel/user-1_report.png',
      file_preview_status: 'ready',
      file_preview_page_count: 2,
    });
    const repository = createRepository({
      message: readyMessage,
    });

    const result = await persistPdfPreview({
      repository,
      userId: USER_ID,
      messageId: MESSAGE_ID,
      previewBytes: PNG_PREVIEW_BYTES,
      pageCount: 2,
    });

    expect(result).toEqual({
      status: 200,
      body: {
        message: readyMessage,
        previewPersisted: true,
      },
    });
    expect(repository.uploadPreviewAsset).not.toHaveBeenCalled();
    expect(repository.updatePreviewMetadata).not.toHaveBeenCalled();
  });

  it('rejects non-PDF or unowned messages', async () => {
    const repository = createRepository({
      message: buildPdfMessage({
        sender_id: 'user-2',
      }),
    });

    const result = await persistPdfPreview({
      repository,
      userId: USER_ID,
      messageId: MESSAGE_ID,
      previewBytes: PNG_PREVIEW_BYTES,
      pageCount: 1,
    });

    expect(result).toEqual({
      status: 403,
      body: { error: 'Forbidden' },
    });
    expect(repository.uploadPreviewAsset).not.toHaveBeenCalled();
  });

  it('rejects requests with missing preview inputs before repository work', async () => {
    const repository = createRepository();

    await expect(
      persistPdfPreview({
        repository,
        userId: USER_ID,
        messageId: '',
        previewBytes: PNG_PREVIEW_BYTES,
        pageCount: 1,
      })
    ).resolves.toEqual({
      status: 400,
      body: { error: 'messageId is required' },
    });

    await expect(
      persistPdfPreview({
        repository,
        userId: USER_ID,
        messageId: MESSAGE_ID,
        previewBytes: new Uint8Array(),
        pageCount: 1,
      })
    ).resolves.toEqual({
      status: 400,
      body: { error: 'previewPngBase64 is required' },
    });

    await expect(
      persistPdfPreview({
        repository,
        userId: USER_ID,
        messageId: MESSAGE_ID,
        previewBytes: PNG_PREVIEW_BYTES,
        pageCount: null,
      })
    ).resolves.toEqual({
      status: 400,
      body: { error: 'pageCount is required' },
    });

    await expect(
      persistPdfPreview({
        repository,
        userId: USER_ID,
        messageId: MESSAGE_ID,
        previewBytes: new Uint8Array([1, 2, 3]),
        pageCount: 1,
      })
    ).resolves.toEqual({
      status: 400,
      body: { error: 'previewPngBase64 must be a PNG image' },
    });

    expect(repository.getOwnedPdfMessage).not.toHaveBeenCalled();
    expect(repository.updatePreviewMetadata).not.toHaveBeenCalled();
    expect(repository.uploadPreviewAsset).not.toHaveBeenCalled();
  });

  it('fails without upload work when the PDF attachment storage path is missing', async () => {
    const repository = createRepository({
      message: buildPdfMessage({
        file_storage_path: null,
      }),
    });

    const result = await persistPdfPreview({
      repository,
      userId: USER_ID,
      messageId: MESSAGE_ID,
      previewBytes: PNG_PREVIEW_BYTES,
      pageCount: 1,
    });

    expect(result).toEqual({
      status: 500,
      body: { error: 'Attachment storage path is missing' },
    });
    expect(repository.updatePreviewMetadata).not.toHaveBeenCalled();
    expect(repository.uploadPreviewAsset).not.toHaveBeenCalled();
    expect(repository.deletePreviewAsset).not.toHaveBeenCalled();
  });

  it('marks the message failed and removes the preview asset when upload fails', async () => {
    const failedMessage = buildPdfMessage({
      file_preview_status: 'failed',
      file_preview_error: 'storage unavailable',
    });
    const repository = createRepository({
      uploadError: 'storage unavailable',
      updatedMessage: failedMessage,
    });

    const result = await persistPdfPreview({
      repository,
      userId: USER_ID,
      messageId: MESSAGE_ID,
      previewBytes: PNG_PREVIEW_BYTES,
      pageCount: 2.4,
    });

    expect(result).toEqual({
      status: 200,
      body: {
        message: failedMessage,
        previewPersisted: false,
      },
    });
    expect(repository.uploadPreviewAsset).toHaveBeenCalledWith(
      'previews/channel/user-1_report.png',
      PNG_PREVIEW_BYTES
    );
    expect(repository.deletePreviewAsset).toHaveBeenCalledWith(
      'previews/channel/user-1_report.png'
    );
    expect(repository.updatePreviewMetadata).toHaveBeenNthCalledWith(
      2,
      MESSAGE_ID,
      {
        file_preview_url: null,
        file_preview_page_count: null,
        file_preview_status: 'failed',
        file_preview_error: 'storage unavailable',
      }
    );
  });
});
