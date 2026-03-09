import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import type {
  ChatSidebarPanelTargetUser,
  PendingSendRegistration,
  PendingComposerAttachment,
} from '../types';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import {
  chatSidebarGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import { useChatAttachmentSend } from './useChatAttachmentSend';
import { getPersistedDeletedThreadMessageIds } from '../utils/message-thread';
import { commitOptimisticMessage } from '../utils/optimistic-message';
import { useChatMutationScope } from './useChatMutationScope';
import { createRuntimeId, createStableKey } from '../utils/runtime-id';
import { useChatAttachmentCleanup } from './useChatAttachmentCleanup';

interface UseChatComposerSendProps {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  editingMessageId: string | null;
  messagesCount?: number;
  pendingComposerAttachments: PendingComposerAttachment[];
  clearPendingComposerAttachments: () => void;
  restorePendingComposerAttachments: (
    attachments: PendingComposerAttachment[]
  ) => void;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  scheduleScrollMessagesToBottom: () => void;
  triggerSendSuccessGlow: () => void;
  broadcastNewMessage: (message: ChatMessage) => void;
  broadcastUpdatedMessage: (message: ChatMessage) => void;
  broadcastDeletedMessage: (messageId: string) => void;
  pendingImagePreviewUrlsRef: MutableRefObject<Map<string, string>>;
  registerPendingSend: (tempMessageId: string) => PendingSendRegistration;
}

export const useChatComposerSend = ({
  user,
  targetUser,
  currentChannelId,
  message,
  setMessage,
  editingMessageId,
  messagesCount = 0,
  pendingComposerAttachments,
  clearPendingComposerAttachments,
  restorePendingComposerAttachments,
  setMessages,
  scheduleScrollMessagesToBottom,
  triggerSendSuccessGlow,
  broadcastNewMessage,
  broadcastUpdatedMessage,
  broadcastDeletedMessage,
  pendingImagePreviewUrlsRef,
  registerPendingSend,
}: UseChatComposerSendProps) => {
  const isSendingRef = useRef(false);
  const {
    isCurrentConversationScopeActive,
    isConversationScopeActive,
    reconcileCurrentConversationMessages,
    runInCurrentConversationScope,
    conversationScopeKey,
  } = useChatMutationScope({
    user,
    targetUser,
    currentChannelId,
    messagesCount,
    setMessages,
  });
  const {
    deleteUploadedStorageFilesOrThrow,
    rollbackPersistedAttachmentThread,
    releasePendingPreviewUrl,
  } = useChatAttachmentCleanup({
    user,
    targetUser,
    currentChannelId,
    setMessages,
    broadcastDeletedMessage,
    pendingImagePreviewUrlsRef,
    isConversationScopeActive,
  });

  const { sendImageMessage, sendFileMessage } = useChatAttachmentSend({
    user,
    targetUser,
    currentChannelId,
    editingMessageId,
    setMessages,
    scheduleScrollMessagesToBottom,
    triggerSendSuccessGlow,
    broadcastNewMessage,
    broadcastUpdatedMessage,
    pendingImagePreviewUrlsRef,
    registerPendingSend,
    conversationScopeKey,
    isConversationScopeActive,
    isCurrentConversationScopeActive,
    reconcileCurrentConversationMessages,
    runInCurrentConversationScope,
    deleteUploadedStorageFilesOrThrow,
    rollbackPersistedAttachmentThread,
    releasePendingPreviewUrl,
  });

  const sendTextMessage = useCallback(
    async (messageText: string, replyToId?: string | null) => {
      if (!user || !targetUser || !currentChannelId) return false;
      if (!messageText.trim()) return false;

      const normalizedMessageText = messageText.trim();
      setMessage('');

      const tempId = createRuntimeId('temp');
      const stableKey = createStableKey([
        user.id,
        normalizedMessageText.slice(0, 10),
      ]);
      const pendingSend = registerPendingSend(tempId);
      const optimisticMessage: ChatMessage = {
        id: tempId,
        sender_id: user.id,
        receiver_id: targetUser.id,
        channel_id: currentChannelId,
        message: normalizedMessageText,
        message_type: 'text',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_read: false,
        reply_to_id: replyToId ?? null,
        sender_name: user.name || 'You',
        receiver_name: targetUser.name || 'Unknown',
        stableKey,
      };

      setMessages(previousMessages => [...previousMessages, optimisticMessage]);
      triggerSendSuccessGlow();
      scheduleScrollMessagesToBottom();

      try {
        const { data: newMessage, error } =
          await chatSidebarGateway.createMessage({
            sender_id: user.id,
            receiver_id: targetUser.id,
            channel_id: currentChannelId,
            message: normalizedMessageText,
            message_type: 'text',
            ...(replyToId ? { reply_to_id: replyToId } : {}),
          });

        if (error || !newMessage) {
          if (
            !pendingSend.isCancelled() &&
            isCurrentConversationScopeActive()
          ) {
            setMessages(previousMessages =>
              previousMessages.filter(messageItem => messageItem.id !== tempId)
            );
            setMessage(currentMessage =>
              currentMessage.length === 0
                ? normalizedMessageText
                : currentMessage
            );
            toast.error('Gagal mengirim pesan', {
              toasterId: CHAT_SIDEBAR_TOASTER_ID,
            });
          }
          return false;
        }

        const realMessage: ChatMessage = {
          ...newMessage,
          sender_name: user.name || 'You',
          receiver_name: targetUser.name || 'Unknown',
          stableKey,
        };

        if (pendingSend.isCancelled()) {
          const { data: deletedMessageIds, error: deleteError } =
            await chatSidebarGateway.deleteMessageThread(realMessage.id);

          if (!deleteError && isCurrentConversationScopeActive()) {
            getPersistedDeletedThreadMessageIds(deletedMessageIds, [
              realMessage.id,
            ]).forEach(deletedMessageId => {
              broadcastDeletedMessage(deletedMessageId);
            });
          }

          if (deleteError) {
            console.error(
              'Error cancelling temp message after persistence:',
              deleteError
            );
            await reconcileCurrentConversationMessages();
          }
          return false;
        }

        runInCurrentConversationScope(() => {
          setMessages(previousMessages =>
            commitOptimisticMessage(previousMessages, tempId, realMessage)
          );

          broadcastNewMessage(realMessage);
        });

        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        if (!pendingSend.isCancelled() && isCurrentConversationScopeActive()) {
          setMessages(previousMessages =>
            previousMessages.filter(messageItem => messageItem.id !== tempId)
          );
          setMessage(currentMessage =>
            currentMessage.length === 0 ? normalizedMessageText : currentMessage
          );
          toast.error('Gagal mengirim pesan', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
        }
        return false;
      } finally {
        pendingSend.complete();
      }
    },
    [
      broadcastNewMessage,
      broadcastDeletedMessage,
      currentChannelId,
      isCurrentConversationScopeActive,
      reconcileCurrentConversationMessages,
      runInCurrentConversationScope,
      registerPendingSend,
      scheduleScrollMessagesToBottom,
      setMessage,
      setMessages,
      targetUser,
      triggerSendSuccessGlow,
      user,
    ]
  );

  const handleSendMessage = useCallback(async () => {
    if (editingMessageId || isSendingRef.current) {
      return;
    }
    if (!user || !targetUser || !currentChannelId) {
      return;
    }

    const hasPendingAttachments = pendingComposerAttachments.length > 0;
    const attachmentsToSend = [...pendingComposerAttachments];
    const messageText = message.trim();

    if (!hasPendingAttachments && !messageText) return;

    isSendingRef.current = true;

    try {
      const shouldAttachCaption =
        hasPendingAttachments && messageText.length > 0;
      if (shouldAttachCaption) {
        setMessage('');
      }
      if (hasPendingAttachments) {
        clearPendingComposerAttachments();
      }

      const lastAttachmentIndex = attachmentsToSend.length - 1;

      for (const [
        attachmentIndex,
        pendingAttachment,
      ] of attachmentsToSend.entries()) {
        const captionForAttachment =
          shouldAttachCaption && attachmentIndex === lastAttachmentIndex
            ? messageText
            : undefined;
        const sentAttachmentMessageId =
          pendingAttachment.fileKind === 'image'
            ? await sendImageMessage(
                pendingAttachment.file,
                captionForAttachment
              )
            : await sendFileMessage(
                {
                  file: pendingAttachment.file,
                  fileName: pendingAttachment.fileName,
                  fileTypeLabel: pendingAttachment.fileTypeLabel,
                  fileKind: pendingAttachment.fileKind,
                  mimeType: pendingAttachment.mimeType,
                },
                captionForAttachment
              );

        if (!sentAttachmentMessageId) {
          if (isCurrentConversationScopeActive()) {
            restorePendingComposerAttachments(
              attachmentsToSend.slice(attachmentIndex)
            );
          }
          if (shouldAttachCaption && isCurrentConversationScopeActive()) {
            setMessage(messageText);
          }
          return;
        }
      }

      if (messageText && !shouldAttachCaption) {
        await sendTextMessage(messageText);
      }
    } finally {
      isSendingRef.current = false;
    }
  }, [
    clearPendingComposerAttachments,
    editingMessageId,
    message,
    pendingComposerAttachments,
    restorePendingComposerAttachments,
    sendFileMessage,
    sendImageMessage,
    sendTextMessage,
    currentChannelId,
    setMessage,
    isCurrentConversationScopeActive,
    targetUser,
    user,
  ]);

  return {
    handleSendMessage,
  };
};
