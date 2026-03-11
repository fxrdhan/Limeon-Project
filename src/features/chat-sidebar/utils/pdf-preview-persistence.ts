import { chatSidebarAssetsGateway } from '../data/chatSidebarAssetsGateway';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import {
  buildPdfPreviewStoragePath,
  fetchPdfBlobWithFallback,
} from './message-file';
import {
  chatRuntimeState,
  type PendingPdfPreviewJob,
} from './chatRuntimeState';
import {
  createPdfPreviewUploadArtifact,
  isPdfPreviewableMessage,
} from './pdf-message-preview';

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

const pendingPdfPreviewStore = chatRuntimeState.pendingPdfPreviews;
const pendingPdfPreviewJobs = pendingPdfPreviewStore.value;

const isPersistablePdfMessage = (message: PersistablePdfMessage) => {
  if (
    message.message_type !== 'file' ||
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

  return isPdfPreviewableMessage(message, message.file_name ?? null);
};

const isDirectPersistablePdfMessage = (
  message: DirectPersistablePdfMessage,
  file: File
) => {
  return (
    isPersistablePdfMessage({
      ...message,
      sender_id: 'direct-upload',
      file_name: message.file_name || file.name || null,
      file_mime_type: message.file_mime_type || file.type,
    }) || file.type.toLowerCase() === 'application/pdf'
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

const persistRenderedPdfPreview = async ({
  messageId,
  sourceFile,
  previewStoragePath,
}: {
  messageId: string;
  sourceFile: Blob;
  previewStoragePath: string;
}) => {
  const renderedPreview = await createPdfPreviewUploadArtifact(
    sourceFile,
    messageId
  );
  if (!renderedPreview) {
    throw new Error('Preview dokumen tidak dapat dirender');
  }

  await chatSidebarAssetsGateway.uploadPdfPreview(
    renderedPreview.previewFile,
    previewStoragePath
  );

  return renderedPreview.pageCount;
};

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

  pendingPdfPreviewStore.hydrate();

  if (pendingPdfPreviewJobs.has(message.id)) {
    return false;
  }

  pendingPdfPreviewJobs.set(message.id, buildPendingPdfPreviewJob(message));
  pendingPdfPreviewStore.persist();
  pendingPdfPreviewStore.notify();
  return true;
};

export const peekPendingPdfPreviewJobs = (senderId: string, limit = 2) => {
  pendingPdfPreviewStore.hydrate();

  return [...pendingPdfPreviewJobs.values()]
    .filter(job => job.senderId === senderId)
    .slice(0, Math.max(1, limit));
};

export const ackPendingPdfPreviewJob = (messageId: string) => {
  pendingPdfPreviewStore.hydrate();
  if (!pendingPdfPreviewJobs.delete(messageId)) {
    return false;
  }

  pendingPdfPreviewStore.persist();
  pendingPdfPreviewStore.notify();
  return true;
};

export const incrementPendingPdfPreviewJobAttempts = (messageId: string) => {
  pendingPdfPreviewStore.hydrate();
  const currentJob = pendingPdfPreviewJobs.get(messageId);
  if (!currentJob) {
    return 0;
  }

  const nextAttempts = currentJob.attempts + 1;
  pendingPdfPreviewJobs.set(messageId, {
    ...currentJob,
    attempts: nextAttempts,
  });
  pendingPdfPreviewStore.persist();
  pendingPdfPreviewStore.notify();
  return nextAttempts;
};

export const hasPendingPdfPreviewJobs = (senderId?: string | null) => {
  pendingPdfPreviewStore.hydrate();
  if (!senderId) {
    return pendingPdfPreviewJobs.size > 0;
  }

  return [...pendingPdfPreviewJobs.values()].some(
    job => job.senderId === senderId
  );
};

export const subscribePendingPdfPreviewQueue = (listener: () => void) => {
  return pendingPdfPreviewStore.subscribe(listener);
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

    const pageCount = await persistRenderedPdfPreview({
      messageId: latestMessage.id,
      sourceFile: pdfBlob,
      previewStoragePath,
    });

    const didPersistReadyPreview = await updatePreviewMetadata(
      latestMessage.id,
      {
        file_preview_url: previewStoragePath,
        file_preview_page_count: pageCount,
        file_preview_status: 'ready',
        file_preview_error: null,
      },
      'Failed to persist PDF preview metadata'
    );

    if (!didPersistReadyPreview) {
      try {
        await chatSidebarAssetsGateway.deleteAsset(previewStoragePath);
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
    void chatSidebarAssetsGateway
      .deleteAsset(previewStoragePath)
      .catch(storageError => {
        console.error(
          'Failed to clean up uploaded PDF preview after persistence failure:',
          storageError
        );
      });

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
  pendingPdfPreviewStore.hydrate();
  if (pendingPdfPreviewJobs.size === 0) {
    return;
  }

  pendingPdfPreviewJobs.clear();
  pendingPdfPreviewStore.persist();
  pendingPdfPreviewStore.notify();
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
    const pageCount = await persistRenderedPdfPreview({
      messageId: message.id,
      sourceFile: file,
      previewStoragePath,
    });

    const didPersistReadyPreview = await updatePreviewMetadata(
      message.id,
      {
        file_preview_url: previewStoragePath,
        file_preview_page_count: pageCount,
        file_preview_status: 'ready',
        file_preview_error: null,
      },
      'Failed to persist PDF preview metadata'
    );

    if (!didPersistReadyPreview) {
      try {
        await chatSidebarAssetsGateway.deleteAsset(previewStoragePath);
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
    void chatSidebarAssetsGateway
      .deleteAsset(previewStoragePath)
      .catch(storageError => {
        console.error(
          'Failed to clean up uploaded PDF preview after persistence failure:',
          storageError
        );
      });

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
