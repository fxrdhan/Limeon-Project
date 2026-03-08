import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  useCallback,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import toast from 'react-hot-toast';
import type {
  ChatSidebarPanelTargetUser,
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

export interface PendingSendRegistration {
  complete: () => void;
  isCancelled: () => boolean;
}

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
    conversationScopeKey,
    isConversationScopeActive,
    runIfConversationScopeActive,
  } = useChatMutationScope({
    user,
    targetUser,
    currentChannelId,
    setMessages,
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
    broadcastDeletedMessage,
    pendingImagePreviewUrlsRef,
    registerPendingSend,
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
            isConversationScopeActive(conversationScopeKey)
          ) {
            setMessages(previousMessages =>
              previousMessages.filter(messageItem => messageItem.id !== tempId)
            );
            setMessage(normalizedMessageText);
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

          if (!deleteError && isConversationScopeActive(conversationScopeKey)) {
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
          }
          return false;
        }

        runIfConversationScopeActive(conversationScopeKey, () => {
          setMessages(previousMessages =>
            commitOptimisticMessage(previousMessages, tempId, realMessage)
          );

          broadcastNewMessage(realMessage);
        });

        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        if (
          !pendingSend.isCancelled() &&
          isConversationScopeActive(conversationScopeKey)
        ) {
          setMessages(previousMessages =>
            previousMessages.filter(messageItem => messageItem.id !== tempId)
          );
          setMessage(normalizedMessageText);
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
      conversationScopeKey,
      currentChannelId,
      isConversationScopeActive,
      runIfConversationScopeActive,
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

      let lastAttachmentMessageId: string | null = null;
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
          if (isConversationScopeActive(conversationScopeKey)) {
            restorePendingComposerAttachments(
              attachmentsToSend.slice(attachmentIndex)
            );
          }
          if (
            shouldAttachCaption &&
            isConversationScopeActive(conversationScopeKey)
          ) {
            setMessage(messageText);
          }
          return;
        }

        lastAttachmentMessageId = sentAttachmentMessageId;
      }

      if (messageText && !shouldAttachCaption) {
        await sendTextMessage(
          messageText,
          hasPendingAttachments ? lastAttachmentMessageId : null
        );
      }
    } finally {
      isSendingRef.current = false;
    }
  }, [
    clearPendingComposerAttachments,
    conversationScopeKey,
    editingMessageId,
    message,
    pendingComposerAttachments,
    restorePendingComposerAttachments,
    sendFileMessage,
    sendImageMessage,
    sendTextMessage,
    currentChannelId,
    setMessage,
    isConversationScopeActive,
    targetUser,
    user,
  ]);

  const handleKeyPress = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  return {
    handleSendMessage,
    handleKeyPress,
  };
};
