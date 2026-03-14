import { describe, expect, it, vi } from 'vite-plus/test';
import {
  persistPdfPreview,
  type ChatPdfPreviewMessageRecord,
  type ChatPdfPreviewRepository,
} from './actions.ts';

const USER_ID = 'user-1';

const buildPdfMessage = (
  overrides: Partial<ChatPdfPreviewMessageRecord> = {}
): ChatPdfPreviewMessageRecord => ({
  id: overrides.id ?? 'message-1',
  sender_id: overrides.sender_id ?? USER_ID,
  message: overrides.message ?? 'documents/channel/user-1_report.pdf',
  message_type: overrides.message_type ?? 'file',
  file_name: overrides.file_name ?? 'report.pdf',
  file_mime_type: overrides.file_mime_type ?? 'application/pdf',
  file_storage_path:
    overrides.file_storage_path ?? 'documents/channel/user-1_report.pdf',
  file_preview_url: overrides.file_preview_url ?? null,
  file_preview_status: overrides.file_preview_status ?? null,
  file_preview_page_count: overrides.file_preview_page_count ?? null,
});

const createRepository = (overrides: {
  message?: ChatPdfPreviewMessageRecord | null;
  getMessageError?: string | null;
  pendingMessage?: ChatPdfPreviewMessageRecord | null;
  pendingError?: string | null;
  readyMessage?: ChatPdfPreviewMessageRecord | null;
  readyError?: string | null;
  failedMessage?: ChatPdfPreviewMessageRecord | null;
  failedError?: string | null;
  uploadError?: string | null;
} = {}) => {
  const updatePreviewMetadata = vi.fn(
    async (
      _messageId: string,
      payload: {
        file_preview_status?: 'pending' | 'ready' | 'failed' | null;
        file_preview_url?: string | null;
        file_preview_page_count?: number | null;
        file_preview_error?: string | null;
      }
    ) => {
      if (payload.file_preview_status === 'pending') {
        return {
          message: overrides.pendingMessage ?? buildPdfMessage(),
          error: overrides.pendingError ?? null,
        };
      }

      if (payload.file_preview_status === 'ready') {
        return {
          message:
            overrides.readyMessage ??
            buildPdfMessage({
              file_preview_status: 'ready',
              file_preview_url: payload.file_preview_url ?? null,
              file_preview_page_count: payload.file_preview_page_count ?? null,
            }),
          error: overrides.readyError ?? null,
        };
      }

      return {
        message:
          overrides.failedMessage ??
          buildPdfMessage({
            file_preview_status: 'failed',
            file_preview_error: payload.file_preview_error ?? null,
          }),
        error: overrides.failedError ?? null,
      };
    }
  );

  const repository: ChatPdfPreviewRepository = {
    getOwnedPdfMessage: vi.fn(async () => ({
      message: overrides.message ?? buildPdfMessage(),
      error: overrides.getMessageError ?? null,
    })),
    updatePreviewMetadata,
    uploadPreviewAsset: vi.fn(async () => ({
      error: overrides.uploadError ?? null,
    })),
    deletePreviewAsset: vi.fn(async () => {}),
  };

  return repository;
};

describe('chat-pdf-preview actions', () => {
  it('persists a PDF preview and marks the message as ready', async () => {
    const repository = createRepository();

    const result = await persistPdfPreview({
      repository,
      userId: USER_ID,
      messageId: 'message-1',
      previewBytes: new Uint8Array([1, 2, 3]),
      pageCount: 4,
    });

    expect(result).toEqual({
      status: 200,
      body: {
        message: buildPdfMessage({
          file_preview_status: 'ready',
          file_preview_url: 'previews/channel/user-1_report.png',
          file_preview_page_count: 4,
        }),
        previewPersisted: true,
      },
    });
    expect(repository.uploadPreviewAsset).toHaveBeenCalledWith(
      'previews/channel/user-1_report.png',
      new Uint8Array([1, 2, 3])
    );
  });

  it('returns a non-fatal failed state when preview upload fails', async () => {
    const repository = createRepository({
      uploadError: 'storage failed',
    });

    const result = await persistPdfPreview({
      repository,
      userId: USER_ID,
      messageId: 'message-1',
      previewBytes: new Uint8Array([1, 2, 3]),
      pageCount: 2,
    });

    expect(result).toEqual({
      status: 200,
      body: {
        message: buildPdfMessage({
          file_preview_status: 'failed',
          file_preview_error: 'storage failed',
        }),
        previewPersisted: false,
      },
    });
    expect(repository.deletePreviewAsset).toHaveBeenCalledWith(
      'previews/channel/user-1_report.png'
    );
  });

  it('rejects non-pdf or unowned messages', async () => {
    const repository = createRepository({
      message: buildPdfMessage({
        sender_id: 'user-2',
      }),
    });

    const result = await persistPdfPreview({
      repository,
      userId: USER_ID,
      messageId: 'message-1',
      previewBytes: new Uint8Array([1]),
      pageCount: 1,
    });

    expect(result).toEqual({
      status: 403,
      body: { error: 'Forbidden' },
    });
    expect(repository.uploadPreviewAsset).not.toHaveBeenCalled();
  });
});
