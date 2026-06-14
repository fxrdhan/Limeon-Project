import type { ChatMessage } from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';
import { commitOptimisticMessage } from './optimistic-message';
import { markMessageAsAttachmentCaption } from './message-relations';
import { createRuntimeId, createStableKey } from './runtime-id';

interface AttachmentParticipant {
  id: string;
  name: string;
}

interface CreateOptimisticAttachmentThreadParams {
  tempIdPrefix: string;
  stableKeySuffix: string;
  captionText?: string;
  currentChannelId: string;
  localPreviewUrl: string;
  timestamp: string;
  user: AttachmentParticipant;
  targetUser: ChatSidebarPanelTargetUser;
  replyToId?: string | null;
  buildOptimisticMessage: (context: {
    tempId: string;
    stableKey: string;
    localPreviewUrl: string;
    timestamp: string;
    replyToId: string | null;
  }) => ChatMessage;
}

export interface OptimisticAttachmentThread {
  tempId: string;
  stableKey: string;
  normalizedCaptionText: string;
  hasAttachmentCaption: boolean;
  captionTempId: string | null;
  captionStableKey: string | null;
  optimisticMessage: ChatMessage;
  optimisticCaptionMessage: ChatMessage | null;
}

export interface PreparedComposerAttachmentOptimisticState {
  appendBeforeSend?: boolean;
  localPreviewUrl: string;
  thread: OptimisticAttachmentThread;
}

interface PrepareAttachmentOptimisticTransactionParams extends Omit<
  CreateOptimisticAttachmentThreadParams,
  'localPreviewUrl' | 'timestamp'
> {
  file: File;
  optimistic?: PreparedComposerAttachmentOptimisticState;
  createLocalPreviewUrl?: (file: File) => string;
  timestamp?: string;
}

export interface PreparedAttachmentOptimisticTransaction {
  localPreviewUrl: string;
  optimisticThread: OptimisticAttachmentThread;
  shouldAppendOptimistic: boolean;
}

export const createOptimisticAttachmentThread = ({
  tempIdPrefix,
  stableKeySuffix,
  captionText,
  currentChannelId,
  localPreviewUrl,
  timestamp,
  user,
  targetUser,
  replyToId,
  buildOptimisticMessage,
}: CreateOptimisticAttachmentThreadParams): OptimisticAttachmentThread => {
  const tempId = createRuntimeId(tempIdPrefix);
  const stableKey = createStableKey([user.id, stableKeySuffix]);
  const normalizedCaptionText = captionText?.trim() ?? '';
  const hasAttachmentCaption = normalizedCaptionText.length > 0;
  const captionTempId = hasAttachmentCaption
    ? createRuntimeId('temp_caption')
    : null;
  const captionStableKey = hasAttachmentCaption ? `${stableKey}-caption` : null;
  const optimisticMessage = buildOptimisticMessage({
    tempId,
    stableKey,
    localPreviewUrl,
    timestamp,
    replyToId: replyToId ?? null,
  });
  const optimisticCaptionMessage = hasAttachmentCaption
    ? markMessageAsAttachmentCaption(
        {
          id: captionTempId!,
          sender_id: user.id,
          receiver_id: targetUser.id,
          channel_id: currentChannelId,
          message: normalizedCaptionText,
          message_type: 'text',
          created_at: timestamp,
          updated_at: timestamp,
          is_read: false,
          reply_to_id: tempId,
          sender_name: user.name || 'You',
          receiver_name: targetUser.name || 'Unknown',
          stableKey: captionStableKey!,
        },
        tempId
      )
    : null;

  return {
    tempId,
    stableKey,
    normalizedCaptionText,
    hasAttachmentCaption,
    captionTempId,
    captionStableKey,
    optimisticMessage,
    optimisticCaptionMessage,
  };
};

export const prepareAttachmentOptimisticTransaction = ({
  optimistic,
  file,
  tempIdPrefix,
  stableKeySuffix,
  captionText,
  currentChannelId,
  user,
  targetUser,
  replyToId,
  buildOptimisticMessage,
  createLocalPreviewUrl = attachmentFile => URL.createObjectURL(attachmentFile),
  timestamp = new Date().toISOString(),
}: PrepareAttachmentOptimisticTransactionParams): PreparedAttachmentOptimisticTransaction => {
  const optimisticThread =
    optimistic?.thread ??
    createOptimisticAttachmentThread({
      tempIdPrefix,
      stableKeySuffix,
      captionText,
      currentChannelId,
      localPreviewUrl:
        optimistic?.localPreviewUrl ?? createLocalPreviewUrl(file),
      timestamp,
      user,
      targetUser,
      replyToId,
      buildOptimisticMessage,
    });
  const localPreviewUrl =
    optimistic?.localPreviewUrl ?? optimisticThread.optimisticMessage.message;

  return {
    localPreviewUrl,
    optimisticThread,
    shouldAppendOptimistic: optimistic?.appendBeforeSend !== false,
  };
};

export const appendOptimisticAttachmentThread = (
  previousMessages: ChatMessage[],
  optimisticThread: Pick<
    OptimisticAttachmentThread,
    'optimisticMessage' | 'optimisticCaptionMessage'
  >
) =>
  optimisticThread.optimisticCaptionMessage
    ? [
        ...previousMessages,
        optimisticThread.optimisticMessage,
        optimisticThread.optimisticCaptionMessage,
      ]
    : [...previousMessages, optimisticThread.optimisticMessage];

export const commitOptimisticAttachmentThread = ({
  previousMessages,
  tempId,
  realMessage,
  captionTempId,
  mappedCaptionMessage,
}: {
  previousMessages: ChatMessage[];
  tempId: string;
  realMessage: ChatMessage;
  captionTempId: string | null;
  mappedCaptionMessage?: ChatMessage | null;
}) => {
  const committedMessages = commitOptimisticMessage(
    previousMessages,
    tempId,
    realMessage
  );

  if (!captionTempId || !mappedCaptionMessage) {
    return committedMessages;
  }

  return commitOptimisticMessage(
    committedMessages,
    captionTempId,
    mappedCaptionMessage
  );
};

export const removeOptimisticAttachmentThread = (
  previousMessages: ChatMessage[],
  tempId: string,
  captionTempId: string | null
) =>
  previousMessages.filter(
    messageItem => ![tempId, captionTempId].includes(messageItem.id)
  );
