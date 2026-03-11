import { CHAT_IMAGE_BUCKET } from '../constants';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import { StorageService } from '@/services/api/storage.service';
import {
  buildPdfPreviewStoragePath,
  fetchPdfBlobWithFallback,
  resolveFileExtension,
} from './message-file';
import { renderPdfPreviewBlob } from './pdf-preview';

type PersistablePdfMessage = Pick<
  ChatMessage,
  | 'id'
  | 'sender_id'
  | 'message'
  | 'message_type'
  | 'file_name'
  | 'file_mime_type'
  | 'file_preview_url'
  | 'file_preview_status'
  | 'file_storage_path'
>;

type DirectPersistablePdfMessage = Pick<
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

export interface PendingPdfPreviewJob {
  messageId: string;
  senderId: string;
  message: string;
  fileName: string | null;
  fileMimeType: string | null;
  fileStoragePath: string;
  attempts: number;
}

const PENDING_PDF_PREVIEW_STORAGE_KEY = 'chat-pending-pdf-preview-jobs';
const pendingPdfPreviewJobs = new Map<string, PendingPdfPreviewJob>();
const pendingPdfPreviewListeners = new Set<() => void>();
let hasHydratedPendingPdfPreviewJobs = false;

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const notifyPendingPdfPreviewListeners = () => {
  pendingPdfPreviewListeners.forEach(listener => {
    listener();
  });
};

const persistPendingPdfPreviewJobs = () => {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      PENDING_PDF_PREVIEW_STORAGE_KEY,
      JSON.stringify([...pendingPdfPreviewJobs.values()])
    );
  } catch {
    // Ignore persistence failures. The in-memory queue still works.
  }
};

const hydratePendingPdfPreviewJobs = () => {
  if (hasHydratedPendingPdfPreviewJobs || !canUseSessionStorage()) {
    hasHydratedPendingPdfPreviewJobs = true;
    return;
  }

  hasHydratedPendingPdfPreviewJobs = true;

  try {
    const serializedJobs = window.sessionStorage.getItem(
      PENDING_PDF_PREVIEW_STORAGE_KEY
    );
    if (!serializedJobs) {
      return;
    }

    const parsedJobs = JSON.parse(serializedJobs);
    if (!Array.isArray(parsedJobs)) {
      return;
    }

    parsedJobs.forEach(job => {
      if (
        typeof job?.messageId === 'string' &&
        job.messageId.trim().length > 0 &&
        typeof job?.senderId === 'string' &&
        job.senderId.trim().length > 0 &&
        typeof job?.message === 'string' &&
        typeof job?.fileStoragePath === 'string' &&
        job.fileStoragePath.trim().length > 0
      ) {
        pendingPdfPreviewJobs.set(job.messageId, {
          messageId: job.messageId,
          senderId: job.senderId,
          message: job.message,
          fileName: typeof job.fileName === 'string' ? job.fileName : null,
          fileMimeType:
            typeof job.fileMimeType === 'string' ? job.fileMimeType : null,
          fileStoragePath: job.fileStoragePath,
          attempts:
            typeof job.attempts === 'number' && Number.isFinite(job.attempts)
              ? Math.max(0, job.attempts)
              : 0,
        });
      }
    });
  } catch {
    // Ignore hydration failures and continue with an empty queue.
  }
};

const isPersistablePdfMessage = (message: PersistablePdfMessage) => {
  if (message.message_type !== 'file') {
    return false;
  }

  if (
    !message.id ||
    !message.sender_id ||
    !message.file_storage_path?.trim() ||
    !message.message?.trim()
  ) {
    return false;
  }

  if (
    message.file_preview_status === 'ready' &&
    message.file_preview_url?.trim()
  ) {
    return false;
  }

  const fileExtension = resolveFileExtension(
    message.file_name || null,
    message.message,
    message.file_mime_type
  );

  return (
    fileExtension === 'pdf' ||
    message.file_mime_type?.toLowerCase().includes('pdf') === true
  );
};

const isDirectPersistablePdfMessage = (
  message: DirectPersistablePdfMessage,
  file: File
) => {
  if (message.message_type !== 'file' || !message.id) {
    return false;
  }

  if (!message.file_storage_path?.trim() || !message.message?.trim()) {
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
    const { error } = await chatSidebarMessagesGateway.updateFilePreview(
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

const buildPendingPdfPreviewJob = (
  message: PersistablePdfMessage
): PendingPdfPreviewJob => ({
  messageId: message.id,
  senderId: message.sender_id,
  message: message.message,
  fileName: message.file_name ?? null,
  fileMimeType: message.file_mime_type ?? null,
  fileStoragePath: message.file_storage_path!.trim(),
  attempts: 0,
});

export const queuePersistedPdfPreview = ({
  message,
  file,
}: {
  message: PersistablePdfMessage;
  file?: File | null;
}) => {
  if (file && isDirectPersistablePdfMessage(message, file)) {
    void persistDirectPdfPreview(message, file);
    return true;
  }

  if (!isPersistablePdfMessage(message)) {
    return false;
  }

  hydratePendingPdfPreviewJobs();

  if (pendingPdfPreviewJobs.has(message.id)) {
    return false;
  }

  pendingPdfPreviewJobs.set(message.id, buildPendingPdfPreviewJob(message));
  persistPendingPdfPreviewJobs();
  notifyPendingPdfPreviewListeners();
  return true;
};

export const peekPendingPdfPreviewJobs = (senderId: string, limit = 2) => {
  hydratePendingPdfPreviewJobs();

  return [...pendingPdfPreviewJobs.values()]
    .filter(job => job.senderId === senderId)
    .slice(0, Math.max(1, limit));
};

export const ackPendingPdfPreviewJob = (messageId: string) => {
  hydratePendingPdfPreviewJobs();
  if (!pendingPdfPreviewJobs.delete(messageId)) {
    return false;
  }

  persistPendingPdfPreviewJobs();
  notifyPendingPdfPreviewListeners();
  return true;
};

export const incrementPendingPdfPreviewJobAttempts = (messageId: string) => {
  hydratePendingPdfPreviewJobs();
  const currentJob = pendingPdfPreviewJobs.get(messageId);
  if (!currentJob) {
    return 0;
  }

  const nextAttempts = currentJob.attempts + 1;
  pendingPdfPreviewJobs.set(messageId, {
    ...currentJob,
    attempts: nextAttempts,
  });
  persistPendingPdfPreviewJobs();
  notifyPendingPdfPreviewListeners();
  return nextAttempts;
};

export const hasPendingPdfPreviewJobs = (senderId?: string | null) => {
  hydratePendingPdfPreviewJobs();
  if (!senderId) {
    return pendingPdfPreviewJobs.size > 0;
  }

  return [...pendingPdfPreviewJobs.values()].some(
    job => job.senderId === senderId
  );
};

export const subscribePendingPdfPreviewQueue = (listener: () => void) => {
  hydratePendingPdfPreviewJobs();
  pendingPdfPreviewListeners.add(listener);

  return () => {
    pendingPdfPreviewListeners.delete(listener);
  };
};

export const persistQueuedPdfPreviewJob = async (job: PendingPdfPreviewJob) => {
  const { data: latestMessage, error: latestMessageError } =
    await chatSidebarMessagesGateway.getMessageById(job.messageId);

  if (latestMessageError) {
    throw latestMessageError;
  }

  if (!latestMessage) {
    return true;
  }

  if (
    latestMessage.file_preview_status === 'ready' &&
    latestMessage.file_preview_url?.trim()
  ) {
    return true;
  }

  const normalizedStoragePath = latestMessage.file_storage_path?.trim();
  if (!normalizedStoragePath) {
    return true;
  }

  const previewStoragePath = buildPdfPreviewStoragePath(normalizedStoragePath);

  await updatePreviewMetadata(
    latestMessage.id,
    {
      file_preview_url: null,
      file_preview_page_count: null,
      file_preview_status: 'pending',
      file_preview_error: null,
    },
    'Failed to mark PDF preview persistence as pending'
  );

  try {
    const pdfBlob = await fetchPdfBlobWithFallback(
      latestMessage.message,
      normalizedStoragePath
    );
    if (!pdfBlob) {
      throw new Error('Preview dokumen tidak dapat dirender');
    }

    const renderedPreview = await renderPdfPreviewBlob(pdfBlob, 260);
    if (!renderedPreview) {
      throw new Error('Preview dokumen tidak dapat dirender');
    }

    const previewFile = new File(
      [renderedPreview.coverBlob],
      `${latestMessage.id}-preview.png`,
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
      latestMessage.id,
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
        latestMessage.id,
        {
          file_preview_url: null,
          file_preview_page_count: null,
          file_preview_status: 'failed',
          file_preview_error: 'Gagal menyimpan metadata preview dokumen',
        },
        'Failed to persist PDF preview failure state after metadata update failure'
      );

      return false;
    }

    return true;
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
      latestMessage.id,
      {
        file_preview_url: null,
        file_preview_page_count: null,
        file_preview_status: 'failed',
        file_preview_error: normalizePreviewError(error),
      },
      'Failed to persist PDF preview failure state'
    );

    return false;
  }
};

export const resetQueuedPdfPreviewJobs = () => {
  hydratePendingPdfPreviewJobs();
  if (pendingPdfPreviewJobs.size === 0) {
    return;
  }

  pendingPdfPreviewJobs.clear();
  persistPendingPdfPreviewJobs();
  notifyPendingPdfPreviewListeners();
};

const persistDirectPdfPreview = async (
  message: DirectPersistablePdfMessage,
  file: File
) => {
  const normalizedStoragePath = message.file_storage_path?.trim();
  if (!normalizedStoragePath) {
    return false;
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

      return false;
    }

    return true;
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

    return false;
  }
};
