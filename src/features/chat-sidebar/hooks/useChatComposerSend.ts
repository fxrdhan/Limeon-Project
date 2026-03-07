import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  useCallback,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type {
  ChatSidebarPanelTargetUser,
  PendingComposerAttachment,
} from '../types';
import {
  chatSidebarGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import { useChatAttachmentSend } from './useChatAttachmentSend';

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
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  scheduleScrollMessagesToBottom: () => void;
  triggerSendSuccessGlow: () => void;
  broadcastNewMessage: (message: ChatMessage) => void;
  broadcastUpdatedMessage: (message: ChatMessage) => void;
  broadcastDeletedMessage: (messageId: string) => void;
  pendingImagePreviewUrlsRef: MutableRefObject<Map<string, string>>;
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
  setMessages,
  scheduleScrollMessagesToBottom,
  triggerSendSuccessGlow,
  broadcastNewMessage,
  broadcastUpdatedMessage,
  broadcastDeletedMessage,
  pendingImagePreviewUrlsRef,
}: UseChatComposerSendProps) => {
  const isSendingRef = useRef(false);
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
  });

  const sendTextMessage = useCallback(
    async (messageText: string, replyToId?: string | null) => {
      if (!user || !targetUser || !currentChannelId) return false;
      if (!messageText.trim()) return false;

      const normalizedMessageText = messageText.trim();
      setMessage('');

      const tempId = `temp_${Date.now()}`;
      const stableKey = `${user.id}-${Date.now()}-${normalizedMessageText.slice(0, 10)}`;
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
          setMessages(previousMessages =>
            previousMessages.filter(messageItem => messageItem.id !== tempId)
          );
          setMessage(normalizedMessageText);
          return false;
        }

        const realMessage: ChatMessage = {
          ...newMessage,
          sender_name: user.name || 'You',
          receiver_name: targetUser.name || 'Unknown',
          stableKey,
        };

        setMessages(previousMessages =>
          previousMessages.map(messageItem =>
            messageItem.id === tempId ? realMessage : messageItem
          )
        );

        broadcastNewMessage(realMessage);

        return true;
      } catch (error) {
        console.error('Error sending message:', error);
        setMessages(previousMessages =>
          previousMessages.filter(messageItem => messageItem.id !== tempId)
        );
        setMessage(normalizedMessageText);
        return false;
      }
    },
    [
      broadcastNewMessage,
      currentChannelId,
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
          if (shouldAttachCaption) {
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
    editingMessageId,
    message,
    pendingComposerAttachments,
    sendFileMessage,
    sendImageMessage,
    sendTextMessage,
    setMessage,
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
