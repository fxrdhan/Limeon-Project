import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { mapPersistedMessageForDisplay } from '../utils/conversation-sync';
import {
  markMessageAsAttachmentCaption,
  toAttachmentCaptionInsertInput,
} from '../utils/message-relations';

interface PersistedAttachmentResult {
  uploadedStoragePath: string;
  uploadedStoragePaths: string[];
  realMessage: ChatMessage | null;
  error: unknown;
}

interface PersistedAttachmentCaptionResult {
  mappedCaptionMessage: ChatMessage | null;
  error: unknown;
}

interface PersistAttachmentMessageParams {
  stableKey: string;
  uploadAsset: () => Promise<{
    path: string;
    additionalStoragePaths?: Array<string | null | undefined>;
  }>;
  createPersistedMessage: (
    uploadedPath: string
  ) => Promise<{ data: ChatMessage | null; error: unknown }>;
  mapPersistedMessage: (
    persistedMessage: ChatMessage,
    uploadedPath: string,
    stableKey: string
  ) => ChatMessage;
}

export const persistAttachmentMessage = async ({
  uploadAsset,
  createPersistedMessage,
  mapPersistedMessage,
  stableKey,
}: PersistAttachmentMessageParams): Promise<PersistedAttachmentResult> => {
  const uploadResult = await uploadAsset();
  const uploadedStoragePath = uploadResult.path;
  const uploadedStoragePaths = [
    uploadedStoragePath,
    ...(uploadResult.additionalStoragePaths ?? []),
  ]
    .map(storagePath => storagePath?.trim() || null)
    .filter((storagePath): storagePath is string => Boolean(storagePath));
  const { data: persistedMessage, error } =
    await createPersistedMessage(uploadedStoragePath);

  if (error || !persistedMessage) {
    return {
      uploadedStoragePath,
      uploadedStoragePaths,
      realMessage: null,
      error,
    };
  }

  return {
    uploadedStoragePath,
    uploadedStoragePaths,
    realMessage: mapPersistedMessage(
      persistedMessage,
      uploadedStoragePath,
      stableKey
    ),
    error: null,
  };
};

export const persistAttachmentCaptionMessage = async ({
  user,
  targetUser,
  currentChannelId,
  realMessage,
  normalizedCaptionText,
  captionStableKey,
}: {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  realMessage: ChatMessage;
  normalizedCaptionText: string;
  captionStableKey: string;
}): Promise<PersistedAttachmentCaptionResult> => {
  if (!user || !targetUser || !currentChannelId) {
    return {
      mappedCaptionMessage: null,
      error: new Error('Missing active chat participants'),
    };
  }

  const { data: captionMessage, error } =
    await chatSidebarMessagesGateway.createMessage(
      toAttachmentCaptionInsertInput({
        receiver_id: targetUser.id,
        message: normalizedCaptionText,
        message_type: 'text',
        reply_to_id: realMessage.id,
      })
    );

  if (error || !captionMessage) {
    return {
      mappedCaptionMessage: null,
      error,
    };
  }

  return {
    mappedCaptionMessage: markMessageAsAttachmentCaption(
      mapPersistedMessageForDisplay(
        captionMessage,
        user,
        targetUser,
        captionStableKey
      ),
      realMessage.id
    ),
    error: null,
  };
};
