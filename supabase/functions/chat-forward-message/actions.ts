import {
  buildChatFileStoragePath,
  buildChatImageStoragePath,
  buildImagePreviewStoragePath,
  inferPreviewMimeTypeFromStoragePath,
  type ChatAttachmentFileKind,
} from '../../../shared/chatAttachmentPaths.ts';
import {
  buildPdfPreviewStoragePath,
} from '../../../shared/chatStoragePaths.ts';
import type {
  ChatForwardMessageResponse,
} from '../../../shared/chatFunctionContracts.ts';

type ForwardableMessageType = 'text' | 'image' | 'file';
type ForwardablePreviewStatus = 'pending' | 'ready' | 'failed' | null;

export interface ChatForwardSourceMessageRecord {
  file_kind?: ChatAttachmentFileKind | null;
  file_mime_type?: string | null;
  file_name?: string | null;
  file_preview_error?: string | null;
  file_preview_page_count?: number | null;
  file_preview_status?: ForwardablePreviewStatus;
  file_preview_url?: string | null;
  file_size?: number | null;
  file_storage_path?: string | null;
  id: string;
  message: string;
  message_type: ForwardableMessageType;
  receiver_id: string;
  sender_id: string;
}

export interface ChatForwardCaptionRecord {
  id: string;
  message: string;
}

export interface ChatForwardInsertedMessageRecord {
  id: string;
}

export interface ChatForwardInsertMessagePayload {
  file_kind?: ChatAttachmentFileKind | null;
  file_mime_type?: string | null;
  file_name?: string | null;
  file_preview_error?: string | null;
  file_preview_page_count?: number | null;
  file_preview_status?: ForwardablePreviewStatus;
  file_preview_url?: string | null;
  file_size?: number | null;
  file_storage_path?: string | null;
  message: string;
  message_relation_kind?: 'attachment_caption' | null;
  message_type: ForwardableMessageType;
  receiver_id: string;
  reply_to_id?: string | null;
}

export interface ChatForwardRepository {
  cleanupStoragePaths: (storagePaths: string[]) => Promise<void>;
  copyStorageObject: (
    sourcePath: string,
    destinationPath: string
  ) => Promise<{ error: string | null }>;
  deleteMessageById: (messageId: string) => Promise<void>;
  getAccessibleMessage: (
    messageId: string,
    userId: string
  ) => Promise<{
    error: string | null;
    message: ChatForwardSourceMessageRecord | null;
  }>;
  getAttachmentCaption: (
    messageId: string,
    userId: string
  ) => Promise<{
    caption: ChatForwardCaptionRecord | null;
    error: string | null;
  }>;
  insertMessage: (
    payload: ChatForwardInsertMessagePayload
  ) => Promise<{
    error: string | null;
    message: ChatForwardInsertedMessageRecord | null;
  }>;
}

const computeDmChannelId = (userId1: string, userId2: string) => {
  const sortedIds = [userId1, userId2].sort();
  return `dm_${sortedIds[0]}_${sortedIds[1]}`;
};

const normalizeMessageId = (value?: string | null) => {
  const normalizedValue = value?.trim().toLowerCase() || '';

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    normalizedValue
  )
    ? normalizedValue
    : null;
};

const normalizeRecipientIds = (recipientIds?: string[] | null) =>
  [...new Set(recipientIds ?? [])].flatMap(recipientId => {
    const normalizedRecipientId = normalizeMessageId(recipientId);
    return normalizedRecipientId ? [normalizedRecipientId] : [];
  });

const resolveForwardedFileKind = (
  message: Pick<
    ChatForwardSourceMessageRecord,
    'file_kind' | 'file_mime_type' | 'file_name' | 'message'
  >
): ChatAttachmentFileKind => {
  if (message.file_kind === 'audio' || message.file_kind === 'document') {
    return message.file_kind;
  }

  const detectionSource = [
    message.file_mime_type ?? '',
    message.file_name ?? '',
    message.message,
  ]
    .join(' ')
    .toLowerCase();

  return /(audio\/|\.mp3\b|\.wav\b|\.ogg\b|\.m4a\b|\.aac\b|\.flac\b)/.test(
    detectionSource
  )
    ? 'audio'
    : 'document';
};

const resolveForwardedFileName = (
  message: Pick<ChatForwardSourceMessageRecord, 'file_name' | 'message'>
) => {
  const explicitName = message.file_name?.trim();
  if (explicitName) {
    return explicitName;
  }

  return message.message.split('/').pop()?.split(/[?#]/)[0]?.trim() || 'Lampiran';
};

const buildForwardedAttachmentStoragePath = ({
  message,
  channelId,
  userId,
}: {
  channelId: string;
  message: ChatForwardSourceMessageRecord;
  userId: string;
}) => {
  if (message.message_type === 'image') {
    return buildChatImageStoragePath({
      channelId,
      senderId: userId,
      fileName: resolveForwardedFileName(message),
      mimeType: message.file_mime_type,
    });
  }

  return buildChatFileStoragePath({
    channelId,
    senderId: userId,
    fileName: resolveForwardedFileName(message),
    mimeType: message.file_mime_type,
    fileKind: resolveForwardedFileKind(message),
  });
};

const buildForwardedPreviewPlan = (
  message: ChatForwardSourceMessageRecord,
  destinationAttachmentPath: string
) => {
  const sourcePreviewPath = message.file_preview_url?.trim() || null;
  if (!sourcePreviewPath) {
    if (message.file_preview_status === 'failed') {
      return {
        initialFields: {
          file_preview_url: null,
          file_preview_page_count: null,
          file_preview_status: 'failed' as const,
          file_preview_error:
            message.file_preview_error?.trim() ||
            'Preview lampiran tidak tersedia',
        },
      };
    }

    return {
      initialFields: null,
    };
  }

  const destinationPreviewPath =
    message.message_type === 'image'
      ? buildImagePreviewStoragePath(
          destinationAttachmentPath,
          inferPreviewMimeTypeFromStoragePath(sourcePreviewPath)
        )
      : buildPdfPreviewStoragePath(destinationAttachmentPath);

  return {
    initialFields: {
      file_preview_url: destinationPreviewPath,
      file_preview_page_count:
        typeof message.file_preview_page_count === 'number'
          ? Math.max(1, message.file_preview_page_count)
          : null,
      file_preview_status: 'ready' as const,
      file_preview_error: null,
    },
    sourcePreviewPath,
    destinationPreviewPath,
  };
};

const cleanupForwardedRecipientArtifacts = async ({
  repository,
  messageId,
  storagePaths,
}: {
  messageId?: string | null;
  repository: ChatForwardRepository;
  storagePaths: string[];
}) => {
  if (messageId) {
    try {
      await repository.deleteMessageById(messageId);
    } catch (error) {
      console.error('Failed to delete forwarded message during rollback', {
        error,
        messageId,
      });
    }
  }

  if (storagePaths.length === 0) {
    return;
  }

  try {
    await repository.cleanupStoragePaths(storagePaths);
  } catch (error) {
    console.error('Failed to clean up forwarded storage artifacts', {
      error,
      storagePaths,
    });
  }
};

const forwardAttachmentToRecipient = async ({
  caption,
  message,
  recipientId,
  repository,
  userId,
}: {
  caption: ChatForwardCaptionRecord | null;
  message: ChatForwardSourceMessageRecord;
  recipientId: string;
  repository: ChatForwardRepository;
  userId: string;
}) => {
  const sourceStoragePath = message.file_storage_path?.trim();
  if (!sourceStoragePath) {
    throw new Error('Attachment storage path is missing');
  }

  const channelId = computeDmChannelId(userId, recipientId);
  const destinationAttachmentPath = buildForwardedAttachmentStoragePath({
    channelId,
    message,
    userId,
  });
  const copiedStoragePaths = [destinationAttachmentPath];

  const attachmentCopyResult = await repository.copyStorageObject(
    sourceStoragePath,
    destinationAttachmentPath
  );
  if (attachmentCopyResult.error) {
    throw new Error(attachmentCopyResult.error);
  }

  const previewPlan = buildForwardedPreviewPlan(message, destinationAttachmentPath);
  let previewFields = previewPlan.initialFields;

  if (
    previewPlan.sourcePreviewPath &&
    previewPlan.destinationPreviewPath &&
    previewFields?.file_preview_status === 'ready'
  ) {
    const previewCopyResult = await repository.copyStorageObject(
      previewPlan.sourcePreviewPath,
      previewPlan.destinationPreviewPath
    );

    if (previewCopyResult.error) {
      previewFields = {
        file_preview_url: null,
        file_preview_page_count: null,
        file_preview_status: 'failed',
        file_preview_error: 'Preview lampiran tidak dapat disalin',
      };
    } else {
      copiedStoragePaths.push(previewPlan.destinationPreviewPath);
    }
  }

  let forwardedMessageId: string | null = null;

  try {
    const insertResult = await repository.insertMessage({
      receiver_id: recipientId,
      message: destinationAttachmentPath,
      message_type: message.message_type,
      file_name: resolveForwardedFileName(message),
      file_kind:
        message.message_type === 'file'
          ? resolveForwardedFileKind(message)
          : null,
      file_mime_type: message.file_mime_type ?? null,
      file_size: message.file_size ?? null,
      file_storage_path: destinationAttachmentPath,
      ...previewFields,
    });

    if (insertResult.error || !insertResult.message) {
      throw new Error(
        insertResult.error || 'Failed to create forwarded attachment message'
      );
    }

    forwardedMessageId = insertResult.message.id;

    const captionText = caption?.message.trim();
    if (!captionText) {
      return;
    }

    const captionInsertResult = await repository.insertMessage({
      receiver_id: recipientId,
      message: captionText,
      message_type: 'text',
      message_relation_kind: 'attachment_caption',
      reply_to_id: forwardedMessageId,
    });

    if (captionInsertResult.error || !captionInsertResult.message) {
      throw new Error(
        captionInsertResult.error || 'Failed to create forwarded caption message'
      );
    }
  } catch (error) {
    await cleanupForwardedRecipientArtifacts({
      repository,
      messageId: forwardedMessageId,
      storagePaths: copiedStoragePaths,
    });
    throw error;
  }
};

export const forwardChatMessage = async ({
  messageId,
  recipientIds,
  repository,
  userId,
}: {
  messageId?: string | null;
  recipientIds?: string[] | null;
  repository: ChatForwardRepository;
  userId: string;
}) => {
  const normalizedMessageId = normalizeMessageId(messageId);
  if (!normalizedMessageId) {
    return {
      status: 400,
      body: { error: 'messageId is required' },
    };
  }

  const normalizedRecipientIds = normalizeRecipientIds(recipientIds).filter(
    recipientId => recipientId !== userId
  );
  if (normalizedRecipientIds.length === 0) {
    return {
      status: 400,
      body: { error: 'recipientIds is required' },
    };
  }

  const { message, error } = await repository.getAccessibleMessage(
    normalizedMessageId,
    userId
  );
  if (error) {
    return {
      status: 500,
      body: { error },
    };
  }

  if (!message || message.message_type === 'text' && message.message.trim() === '') {
    return {
      status: 403,
      body: { error: 'Forbidden' },
    };
  }

  const { caption, error: captionError } =
    message.message_type === 'text'
      ? { caption: null, error: null }
      : await repository.getAttachmentCaption(message.id, userId);
  if (captionError) {
    return {
      status: 500,
      body: { error: captionError },
    };
  }

  const forwardedRecipientIds: string[] = [];
  const failedRecipientIds: string[] = [];

  for (const recipientId of normalizedRecipientIds) {
    try {
      if (message.message_type === 'text') {
        const insertResult = await repository.insertMessage({
          receiver_id: recipientId,
          message: message.message,
          message_type: 'text',
        });

        if (insertResult.error || !insertResult.message) {
          throw new Error(
            insertResult.error || 'Failed to create forwarded text message'
          );
        }
      } else {
        await forwardAttachmentToRecipient({
          caption,
          message,
          recipientId,
          repository,
          userId,
        });
      }

      forwardedRecipientIds.push(recipientId);
    } catch (error) {
      console.error('Failed to forward chat message to recipient', {
        error,
        messageId: message.id,
        recipientId,
      });
      failedRecipientIds.push(recipientId);
    }
  }

  return {
    status: 200,
    body: {
      forwardedRecipientIds,
      failedRecipientIds,
    } satisfies ChatForwardMessageResponse,
  };
};
