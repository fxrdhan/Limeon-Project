import {
  buildPdfPreviewStoragePath,
  resolveFileExtension,
} from "../../../shared/chatStoragePaths.ts";
import type {
  ChatPdfPreviewMessagePayload,
  ChatPdfPreviewResponse,
  ChatPdfPreviewStatus,
} from "../../../shared/chatFunctionContracts.ts";

interface ChatStoragePathRecord {
  message: string;
  message_type: string | null;
  file_name?: string | null;
  file_mime_type?: string | null;
  file_preview_url?: string | null;
  file_storage_path?: string | null;
}

export interface ChatPdfPreviewMessageRecord
  extends ChatStoragePathRecord,
    ChatPdfPreviewMessagePayload {
  file_preview_status?: ChatPdfPreviewStatus | null;
}

export interface ChatPdfPreviewRepository {
  getOwnedPdfMessage: (
    messageId: string,
    userId: string
  ) => Promise<{
    message: ChatPdfPreviewMessageRecord | null;
    error: string | null;
  }>;
  updatePreviewMetadata: (
    messageId: string,
    payload: {
      file_preview_url?: string | null;
      file_preview_page_count?: number | null;
      file_preview_status?: 'pending' | 'ready' | 'failed' | null;
      file_preview_error?: string | null;
    }
  ) => Promise<{
    message: ChatPdfPreviewMessageRecord | null;
    error: string | null;
  }>;
  uploadPreviewAsset: (
    storagePath: string,
    previewBytes: Uint8Array
  ) => Promise<{ error: string | null }>;
  deletePreviewAsset: (storagePath: string) => Promise<void>;
}

const normalizePreviewError = (error: unknown) => {
  const fallbackMessage = 'Preview dokumen tidak tersedia';
  if (!(error instanceof Error) || !error.message.trim()) {
    return fallbackMessage;
  }

  return error.message.trim().slice(0, 200);
};

const isPdfPreviewableMessage = (message: ChatPdfPreviewMessageRecord) => {
  if (message.message_type !== 'file') {
    return false;
  }

  const fileExtension = resolveFileExtension(
    message.file_name ?? null,
    message.message,
    message.file_mime_type
  );

  return (
    fileExtension === 'pdf' ||
    message.file_mime_type?.toLowerCase().includes('pdf') === true
  );
};

export const persistPdfPreview = async ({
  repository,
  userId,
  messageId,
  previewBytes,
  pageCount,
}: {
  repository: ChatPdfPreviewRepository;
  userId: string;
  messageId?: string | null;
  previewBytes?: Uint8Array | null;
  pageCount?: number | null;
}) => {
  const normalizedMessageId = messageId?.trim();
  if (!normalizedMessageId) {
    return {
      status: 400,
      body: { error: 'messageId is required' },
    };
  }

  if (!previewBytes || previewBytes.byteLength === 0) {
    return {
      status: 400,
      body: { error: 'previewPngBase64 is required' },
    };
  }

  const normalizedPageCount =
    typeof pageCount === 'number' && Number.isFinite(pageCount)
      ? Math.max(1, Math.round(pageCount))
      : null;
  if (normalizedPageCount === null) {
    return {
      status: 400,
      body: { error: 'pageCount is required' },
    };
  }

  const { message, error } = await repository.getOwnedPdfMessage(
    normalizedMessageId,
    userId
  );

  if (error) {
    return {
      status: 500,
      body: { error },
    };
  }

  if (!message || message.sender_id !== userId || !isPdfPreviewableMessage(message)) {
    return {
      status: 403,
      body: { error: 'Forbidden' },
    };
  }

  if (
    message.file_preview_status === 'ready' &&
    message.file_preview_url?.trim()
  ) {
    return {
      status: 200,
      body: {
        message,
        previewPersisted: true,
      } satisfies ChatPdfPreviewResponse,
    };
  }

  const normalizedStoragePath = message.file_storage_path?.trim();
  if (!normalizedStoragePath) {
    return {
      status: 500,
      body: { error: 'Attachment storage path is missing' },
    };
  }

  const previewStoragePath = buildPdfPreviewStoragePath(normalizedStoragePath);
  const pendingResult = await repository.updatePreviewMetadata(message.id, {
    file_preview_url: null,
    file_preview_page_count: null,
    file_preview_status: 'pending',
    file_preview_error: null,
  });

  if (pendingResult.error) {
    return {
      status: 500,
      body: { error: pendingResult.error },
    };
  }

  try {
    const uploadResult = await repository.uploadPreviewAsset(
      previewStoragePath,
      previewBytes
    );
    if (uploadResult.error) {
      throw new Error(uploadResult.error);
    }

    const readyResult = await repository.updatePreviewMetadata(message.id, {
      file_preview_url: previewStoragePath,
      file_preview_page_count: normalizedPageCount,
      file_preview_status: 'ready',
      file_preview_error: null,
    });

    if (readyResult.error || !readyResult.message) {
      await repository.deletePreviewAsset(previewStoragePath);

      const failedResult = await repository.updatePreviewMetadata(message.id, {
        file_preview_url: null,
        file_preview_page_count: null,
        file_preview_status: 'failed',
        file_preview_error: 'Gagal menyimpan metadata preview dokumen',
      });

      if (failedResult.message) {
        return {
          status: 200,
          body: {
            message: failedResult.message,
            previewPersisted: false,
          } satisfies ChatPdfPreviewResponse,
        };
      }

      return {
        status: 500,
        body: {
          error:
            readyResult.error ?? 'Failed to persist PDF preview metadata',
        },
      };
    }

    return {
      status: 200,
      body: {
        message: readyResult.message,
        previewPersisted: true,
      } satisfies ChatPdfPreviewResponse,
    };
  } catch (error) {
    await repository.deletePreviewAsset(previewStoragePath);

    const failedResult = await repository.updatePreviewMetadata(message.id, {
      file_preview_url: null,
      file_preview_page_count: null,
      file_preview_status: 'failed',
      file_preview_error: normalizePreviewError(error),
    });

    if (failedResult.message) {
      return {
        status: 200,
        body: {
          message: failedResult.message,
          previewPersisted: false,
        } satisfies ChatPdfPreviewResponse,
      };
    }

    return {
      status: 500,
      body: { error: normalizePreviewError(error) },
    };
  }
};
