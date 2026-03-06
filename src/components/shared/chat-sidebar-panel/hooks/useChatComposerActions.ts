import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import toast from 'react-hot-toast';
import { chatService, type ChatMessage } from '@/services/api/chat.service';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import { useChatComposerSend } from './useChatComposerSend';
import type {
  ChatSidebarPanelTargetUser,
  PendingComposerAttachment,
} from '../types';
import { getAttachmentFileName } from '../utils/attachment';
import { getClipboardImagePayload } from '../utils/clipboard';

interface UseChatComposerActionsProps {
  user: {
    id: string;
    name: string;
  } | null;
  targetUser?: ChatSidebarPanelTargetUser;
  currentChannelId: string | null;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  message: string;
  setMessage: Dispatch<SetStateAction<string>>;
  editingMessageId: string | null;
  setEditingMessageId: Dispatch<SetStateAction<string | null>>;
  pendingComposerAttachments: PendingComposerAttachment[];
  clearPendingComposerAttachments: () => void;
  closeMessageMenu: () => void;
  focusMessageComposer: () => void;
  scheduleScrollMessagesToBottom: () => void;
  triggerSendSuccessGlow: () => void;
  broadcastNewMessage: (message: ChatMessage) => void;
  broadcastUpdatedMessage: (message: ChatMessage) => void;
  broadcastDeletedMessage: (messageId: string) => void;
  pendingImagePreviewUrlsRef: MutableRefObject<Map<string, string>>;
}

export const useChatComposerActions = ({
  user,
  targetUser,
  currentChannelId,
  messages,
  setMessages,
  message,
  setMessage,
  editingMessageId,
  setEditingMessageId,
  pendingComposerAttachments,
  clearPendingComposerAttachments,
  closeMessageMenu,
  focusMessageComposer,
  scheduleScrollMessagesToBottom,
  triggerSendSuccessGlow,
  broadcastNewMessage,
  broadcastUpdatedMessage,
  broadcastDeletedMessage,
  pendingImagePreviewUrlsRef,
}: UseChatComposerActionsProps) => {
  const send = useChatComposerSend({
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
    pendingImagePreviewUrlsRef,
  });

  const handleUpdateMessage = useCallback(async () => {
    if (
      !message.trim() ||
      !user ||
      !targetUser ||
      !currentChannelId ||
      !editingMessageId
    ) {
      return;
    }

    const messageId = editingMessageId;
    const updatedText = message.trim();
    const updatedAt = new Date().toISOString();
    const existingMessage = messages.find(
      candidate => candidate.id === messageId
    );

    setMessage('');
    setEditingMessageId(null);
    closeMessageMenu();

    setMessages(previousMessages =>
      previousMessages.map(messageItem =>
        messageItem.id === messageId
          ? { ...messageItem, message: updatedText, updated_at: updatedAt }
          : messageItem
      )
    );

    if (messageId.startsWith('temp_')) return;

    try {
      const { data: updatedMessage, error } = await chatService.updateMessage(
        messageId,
        {
          message: updatedText,
          updated_at: updatedAt,
        }
      );

      if (error) {
        console.error('Error updating message:', error);
        return;
      }

      const mappedMessage: ChatMessage = {
        ...(updatedMessage as ChatMessage),
        sender_name: existingMessage?.sender_name || user.name || 'You',
        receiver_name:
          existingMessage?.receiver_name || targetUser.name || 'Unknown',
        stableKey: existingMessage?.stableKey,
      };

      setMessages(previousMessages =>
        previousMessages.map(messageItem =>
          messageItem.id === messageId ? mappedMessage : messageItem
        )
      );

      broadcastUpdatedMessage(mappedMessage);
    } catch (error) {
      console.error('Error updating message:', error);
    }
  }, [
    broadcastUpdatedMessage,
    closeMessageMenu,
    currentChannelId,
    editingMessageId,
    message,
    messages,
    setEditingMessageId,
    setMessage,
    setMessages,
    targetUser,
    user,
  ]);

  const handleDeleteMessage = useCallback(
    async (targetMessage: ChatMessage) => {
      if (!user || !targetUser || !currentChannelId) return;

      closeMessageMenu();
      const linkedCaptionMessageIds = messages
        .filter(
          messageItem =>
            messageItem.message_type === 'text' &&
            messageItem.reply_to_id === targetMessage.id &&
            messageItem.sender_id === targetMessage.sender_id &&
            messageItem.receiver_id === targetMessage.receiver_id &&
            messageItem.channel_id === targetMessage.channel_id
        )
        .map(messageItem => messageItem.id);
      const messageIdsToDelete = [targetMessage.id, ...linkedCaptionMessageIds];

      setMessages(previousMessages =>
        previousMessages.filter(
          messageItem => !messageIdsToDelete.includes(messageItem.id)
        )
      );

      if (editingMessageId && messageIdsToDelete.includes(editingMessageId)) {
        setEditingMessageId(null);
        setMessage('');
      }

      const persistedMessageIds = messageIdsToDelete.filter(
        messageId => !messageId.startsWith('temp_')
      );
      if (persistedMessageIds.length === 0) return;

      try {
        for (const messageId of persistedMessageIds) {
          const { error } = await chatService.deleteMessage(messageId);
          if (error) {
            console.error('Error deleting message:', error);
            return;
          }
        }

        persistedMessageIds.forEach(messageId => {
          broadcastDeletedMessage(messageId);
        });
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    },
    [
      broadcastDeletedMessage,
      closeMessageMenu,
      currentChannelId,
      editingMessageId,
      messages,
      setEditingMessageId,
      setMessage,
      setMessages,
      targetUser,
      user,
    ]
  );

  const handleEditMessage = useCallback(
    (targetMessage: ChatMessage) => {
      clearPendingComposerAttachments();
      setEditingMessageId(targetMessage.id);
      setMessage(targetMessage.message);
      closeMessageMenu();
      requestAnimationFrame(focusMessageComposer);
      setTimeout(focusMessageComposer, 60);
    },
    [
      clearPendingComposerAttachments,
      closeMessageMenu,
      focusMessageComposer,
      setEditingMessageId,
      setMessage,
    ]
  );

  const handleCancelEditMessage = useCallback(() => {
    setEditingMessageId(null);
    setMessage('');
    closeMessageMenu();
    requestAnimationFrame(focusMessageComposer);
  }, [closeMessageMenu, focusMessageComposer, setEditingMessageId, setMessage]);

  const handleCopyMessage = useCallback(
    async (targetMessage: ChatMessage) => {
      try {
        if (targetMessage.message_type === 'image') {
          const clipboardWithWrite = navigator.clipboard as Clipboard & {
            write?: (items: ClipboardItem[]) => Promise<void>;
          };
          const writeImageToClipboard = clipboardWithWrite.write?.bind(
            navigator.clipboard
          );
          const canCopyBinaryImage =
            typeof ClipboardItem !== 'undefined' &&
            typeof writeImageToClipboard === 'function';

          if (!canCopyBinaryImage) {
            throw new Error('Clipboard image write is not supported');
          }

          const response = await fetch(targetMessage.message);
          if (!response.ok) {
            throw new Error('Failed to fetch image for clipboard');
          }

          const imageBlob = await response.blob();
          const clipboardPayload = await getClipboardImagePayload(imageBlob);
          await writeImageToClipboard([
            new ClipboardItem({
              [clipboardPayload.mimeType]: clipboardPayload.blob,
            }),
          ]);

          toast.success('Gambar berhasil disalin', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
          return;
        }

        await navigator.clipboard.writeText(targetMessage.message);
        toast.success('Pesan berhasil disalin', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
      } catch (error) {
        console.error('Error copying message:', error);
        toast.error(
          targetMessage.message_type === 'image'
            ? 'Gagal menyalin gambar ke clipboard'
            : 'Gagal menyalin pesan',
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
      } finally {
        closeMessageMenu();
      }
    },
    [closeMessageMenu]
  );

  const handleDownloadMessage = useCallback(
    async (targetMessage: ChatMessage) => {
      const fileUrl = targetMessage.message;
      const fileName = getAttachmentFileName(targetMessage);

      if (!fileUrl) {
        toast.error('File tidak tersedia untuk diunduh', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        closeMessageMenu();
        return;
      }

      try {
        await toast.promise(
          (async () => {
            const response = await fetch(fileUrl);
            if (!response.ok) {
              throw new Error('Failed to fetch file for download');
            }

            const fileBlob = await response.blob();
            const objectUrl = URL.createObjectURL(fileBlob);
            const link = document.createElement('a');

            link.href = objectUrl;
            link.download = fileName;
            link.rel = 'noreferrer';
            document.body.append(link);
            link.click();
            link.remove();

            window.setTimeout(() => {
              URL.revokeObjectURL(objectUrl);
            }, 1500);
          })(),
          {
            loading: 'Menyiapkan unduhan...',
            success: 'Unduhan dimulai',
            error: 'Gagal mengunduh file',
          },
          {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          }
        );
      } catch (error) {
        console.error('Error downloading file:', error);
      } finally {
        closeMessageMenu();
      }
    },
    [closeMessageMenu]
  );

  const handleSendMessage = useCallback(async () => {
    if (editingMessageId) {
      await handleUpdateMessage();
      return;
    }

    await send.handleSendMessage();
  }, [editingMessageId, handleUpdateMessage, send]);

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
    handleEditMessage,
    handleDeleteMessage,
    handleCancelEditMessage,
    handleCopyMessage,
    handleDownloadMessage,
    handleSendMessage,
    handleKeyPress,
  };
};
