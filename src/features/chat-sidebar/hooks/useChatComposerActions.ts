import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  useCallback,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import {
  chatSidebarGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import { useChatComposerSend } from './useChatComposerSend';
import type {
  ChatSidebarPanelTargetUser,
  PendingComposerAttachment,
} from '../types';
import { getAttachmentFileName } from '../utils/attachment';
import { getClipboardImagePayload } from '../utils/clipboard';
import { isTempMessageId } from '../utils/optimistic-message';
import { reconcileConversationMessages } from '../utils/conversation-sync';

interface PendingSendRegistration {
  complete: () => void;
  isCancelled: () => boolean;
}

type PendingSendRegistryRef = MutableRefObject<
  Map<string, { cancelled: boolean }>
>;

export interface DeleteMessageOptions {
  suppressErrorToast?: boolean;
}

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

const createPendingSendRegistration = (
  pendingSendRegistryRef: PendingSendRegistryRef,
  tempMessageId: string
): PendingSendRegistration => {
  const pendingEntry = { cancelled: false };
  pendingSendRegistryRef.current.set(tempMessageId, pendingEntry);

  return {
    complete: () => {
      const currentEntry = pendingSendRegistryRef.current.get(tempMessageId);
      if (currentEntry === pendingEntry) {
        pendingSendRegistryRef.current.delete(tempMessageId);
      }
    },
    isCancelled: () => pendingEntry.cancelled,
  };
};

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
  const pendingSendRegistryRef = useRef<Map<string, { cancelled: boolean }>>(
    new Map()
  );
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
    broadcastDeletedMessage,
    pendingImagePreviewUrlsRef,
    registerPendingSend: tempMessageId =>
      createPendingSendRegistration(pendingSendRegistryRef, tempMessageId),
  });

  const reconcileMessagesFromServer = useCallback(
    async (fallbackMessages: ChatMessage[]) => {
      if (!user || !targetUser) {
        setMessages(fallbackMessages);
        return;
      }

      try {
        const { data: latestMessages, error } =
          await chatSidebarGateway.fetchConversationMessages(
            user.id,
            targetUser.id,
            currentChannelId
          );

        if (error || !latestMessages) {
          setMessages(fallbackMessages);
          return;
        }

        reconcileConversationMessages({
          latestMessages,
          user,
          targetUser,
          setMessages,
        });
      } catch (error) {
        console.error('Error reconciling conversation:', error);
        setMessages(fallbackMessages);
      }
    },
    [currentChannelId, setMessages, targetUser, user]
  );

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

    if (editingMessageId.startsWith('temp_')) {
      setEditingMessageId(null);
      setMessage('');
      closeMessageMenu();
      toast.error('Pesan yang masih dikirim belum bisa diedit', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    const messageId = editingMessageId;
    const updatedText = message.trim();
    const updatedAt = new Date().toISOString();
    const existingMessage = messages.find(
      candidate => candidate.id === messageId
    );
    const restoreFailedEdit = () => {
      if (existingMessage) {
        setMessages(previousMessages =>
          previousMessages.map(messageItem =>
            messageItem.id === messageId ? existingMessage : messageItem
          )
        );
      }

      setEditingMessageId(messageId);
      setMessage(updatedText);
      requestAnimationFrame(focusMessageComposer);
      toast.error('Gagal memperbarui pesan', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
    };

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
      const { data: updatedMessage, error } =
        await chatSidebarGateway.updateMessage(messageId, {
          message: updatedText,
          updated_at: updatedAt,
        });

      if (error) {
        console.error('Error updating message:', error);
        restoreFailedEdit();
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
      restoreFailedEdit();
    }
  }, [
    broadcastUpdatedMessage,
    closeMessageMenu,
    currentChannelId,
    editingMessageId,
    focusMessageComposer,
    message,
    messages,
    setEditingMessageId,
    setMessage,
    setMessages,
    targetUser,
    user,
  ]);

  const handleDeleteMessage = useCallback(
    async (
      targetMessage: ChatMessage,
      options?: DeleteMessageOptions
    ): Promise<boolean> => {
      if (!user || !targetUser || !currentChannelId) return false;

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
      const messageIdsToDelete = [...linkedCaptionMessageIds, targetMessage.id];
      const messagesSnapshot = messages.map(messageItem => ({
        ...messageItem,
      }));

      setMessages(previousMessages =>
        previousMessages.filter(
          messageItem => !messageIdsToDelete.includes(messageItem.id)
        )
      );

      if (editingMessageId && messageIdsToDelete.includes(editingMessageId)) {
        setEditingMessageId(null);
        setMessage('');
      }

      const isPersistedThread = !isTempMessageId(targetMessage.id);
      if (!isPersistedThread) {
        const pendingEntry = pendingSendRegistryRef.current.get(
          targetMessage.id
        );
        if (pendingEntry) {
          pendingEntry.cancelled = true;
        }
        return true;
      }

      try {
        const { data: deletedMessageIds, error } =
          await chatSidebarGateway.deleteMessageThread(targetMessage.id);
        if (error) {
          console.error('Error deleting message thread:', error);
          throw error;
        }

        const broadcastTargetIds =
          deletedMessageIds && deletedMessageIds.length > 0
            ? deletedMessageIds
            : messageIdsToDelete.filter(
                messageId => !messageId.startsWith('temp_')
              );

        broadcastTargetIds.forEach(deletedMessageId => {
          broadcastDeletedMessage(deletedMessageId);
        });
        return true;
      } catch (error) {
        console.error('Error deleting message:', error);
        await reconcileMessagesFromServer(messagesSnapshot);
        if (!options?.suppressErrorToast) {
          toast.error('Gagal menghapus pesan', {
            toasterId: CHAT_SIDEBAR_TOASTER_ID,
          });
        }
        return false;
      }
    },
    [
      broadcastDeletedMessage,
      closeMessageMenu,
      currentChannelId,
      editingMessageId,
      messages,
      reconcileMessagesFromServer,
      setEditingMessageId,
      setMessage,
      setMessages,
      targetUser,
      user,
      pendingSendRegistryRef,
    ]
  );

  const handleEditMessage = useCallback(
    (targetMessage: ChatMessage) => {
      if (targetMessage.id.startsWith('temp_')) {
        closeMessageMenu();
        toast.error('Pesan yang masih dikirim belum bisa diedit', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
        return;
      }

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
