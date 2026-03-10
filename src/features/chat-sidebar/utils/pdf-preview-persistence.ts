import { CHAT_IMAGE_BUCKET } from '../constants';
import {
  chatMessagesService,
  type ChatMessage,
} from '@/services/api/chat.service';
import { StorageService } from '@/services/api/storage.service';
import {
  buildPdfPreviewStoragePath,
  resolveFileExtension,
} from './message-file';
import { renderPdfPreviewBlob } from './pdf-preview';

type PersistablePdfMessage = Pick<
  ChatMessage,
  | 'id'
  | 'message'
  | 'message_type'
  | 'file_name'
  | 'file_mime_type'
  | 'file_preview_url'
  | 'file_preview_status'
  | 'file_storage_path'
>;

const queuedPdfPreviewJobs = new Map<string, Promise<void>>();

const isPersistablePdfMessage = (
  message: PersistablePdfMessage,
  file: File
) => {
  if (message.message_type !== 'file') {
    return false;
  }

  if (!message.id || !message.file_storage_path?.trim()) {
    return false;
  }

  if (
    message.file_preview_status === 'ready' &&
    message.file_preview_url?.trim()
  ) {
    return false;
  }

  const fileExtension = resolveFileExtension(
    message.file_name || file.name || null,
    message.message,
    message.file_mime_type || file.type
  );

  return (
    fileExtension === 'pdf' ||
    message.file_mime_type?.toLowerCase().includes('pdf') === true ||
    file.type.toLowerCase() === 'application/pdf'
  );
};

const normalizePreviewError = (error: unknown) => {
  const fallbackMessage = 'Preview dokumen tidak tersedia';
  if (!(error instanceof Error) || !error.message.trim()) {
    return fallbackMessage;
  }

  return error.message.trim().slice(0, 200);
};

const updatePreviewMetadata = async (
  messageId: string,
  payload: {
    file_preview_url?: string | null;
    file_preview_page_count?: number | null;
    file_preview_status?: 'pending' | 'ready' | 'failed' | null;
    file_preview_error?: string | null;
  },
  errorContext: string
) => {
  try {
    const { error } = await chatMessagesService.updateFilePreview(
      messageId,
      payload
    );

    if (error) {
      console.error(errorContext, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(errorContext, error);
    return false;
  }
};

const persistPdfPreview = async (
  message: PersistablePdfMessage,
  file: File
) => {
  const normalizedStoragePath = message.file_storage_path?.trim();
  if (!normalizedStoragePath) {
    return;
  }

  const previewStoragePath = buildPdfPreviewStoragePath(normalizedStoragePath);

  await updatePreviewMetadata(
    message.id,
    {
      file_preview_url: null,
      file_preview_page_count: null,
      file_preview_status: 'pending',
      file_preview_error: null,
    },
    'Failed to mark PDF preview persistence as pending'
  );

  try {
    const renderedPreview = await renderPdfPreviewBlob(file, 260);
    if (!renderedPreview) {
      throw new Error('Preview dokumen tidak dapat dirender');
    }

    const previewFile = new File(
      [renderedPreview.coverBlob],
      `${message.id}-preview.png`,
      {
        type: 'image/png',
      }
    );

    await StorageService.uploadRawFile(
      CHAT_IMAGE_BUCKET,
      previewFile,
      previewStoragePath,
      'image/png'
    );

    const didPersistReadyPreview = await updatePreviewMetadata(
      message.id,
      {
        file_preview_url: previewStoragePath,
        file_preview_page_count: renderedPreview.pageCount,
        file_preview_status: 'ready',
        file_preview_error: null,
      },
      'Failed to persist PDF preview metadata'
    );

    if (!didPersistReadyPreview) {
      try {
        await StorageService.deleteFile(CHAT_IMAGE_BUCKET, previewStoragePath);
      } catch (storageError) {
        console.error(
          'Failed to clean up uploaded PDF preview after metadata update failure:',
          storageError
        );
      }

      await updatePreviewMetadata(
        message.id,
        {
          file_preview_url: null,
          file_preview_page_count: null,
          file_preview_status: 'failed',
          file_preview_error: 'Gagal menyimpan metadata preview dokumen',
        },
        'Failed to persist PDF preview failure state after metadata update failure'
      );
    }
  } catch (error) {
    void StorageService.deleteFile(CHAT_IMAGE_BUCKET, previewStoragePath).catch(
      storageError => {
        console.error(
          'Failed to clean up uploaded PDF preview after persistence failure:',
          storageError
        );
      }
    );

    await updatePreviewMetadata(
      message.id,
      {
        file_preview_url: null,
        file_preview_page_count: null,
        file_preview_status: 'failed',
        file_preview_error: normalizePreviewError(error),
      },
      'Failed to persist PDF preview failure state'
    );
  }
};

export const queuePersistedPdfPreview = ({
  message,
  file,
}: {
  message: PersistablePdfMessage;
  file: File;
}) => {
  if (!isPersistablePdfMessage(message, file)) {
    return false;
  }

  if (queuedPdfPreviewJobs.has(message.id)) {
    return false;
  }

  const previewJob = (async () => {
    try {
      await persistPdfPreview(message, file);
    } finally {
      queuedPdfPreviewJobs.delete(message.id);
    }
  })();

  queuedPdfPreviewJobs.set(message.id, previewJob);

  return true;
};

export const resetQueuedPdfPreviewJobs = () => {
  queuedPdfPreviewJobs.clear();
};
