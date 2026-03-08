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
import { getPersistedDeletedThreadMessageIds } from '../utils/message-thread';
import { getAttachmentCaptionMessageIds } from '../utils/message-relations';
import { isTempMessageId } from '../utils/optimistic-message';
import { getConversationScopeKey } from '../utils/conversation-scope';
import { useActiveConversationScope } from './useActiveConversationScope';
import { useChatConversationReconciler } from './useChatConversationReconciler';
import { useChatMessageTransferActions } from './useChatMessageTransferActions';

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
  restorePendingComposerAttachments: (
    attachments: PendingComposerAttachment[]
  ) => void;
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
  restorePendingComposerAttachments,
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
  const { isConversationScopeActive } = useActiveConversationScope({
    userId: user?.id,
    targetUserId: targetUser?.id,
    channelId: currentChannelId,
  });

  const send = useChatComposerSend({
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
    registerPendingSend: tempMessageId =>
      createPendingSendRegistration(pendingSendRegistryRef, tempMessageId),
  });
  const { handleCopyMessage, handleDownloadMessage } =
    useChatMessageTransferActions({
      closeMessageMenu,
    });

  const reconcileMessagesFromServer = useChatConversationReconciler({
    user,
    targetUser,
    currentChannelId,
    setMessages,
    isConversationScopeActive,
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

    if (editingMessageId.startsWith('temp_')) {
      setEditingMessageId(null);
      setMessage('');
      closeMessageMenu();
      toast.error('Pesan yang masih dikirim belum bisa diedit', {
        toasterId: CHAT_SIDEBAR_TOASTER_ID,
      });
      return;
    }

    const conversationScopeKey = getConversationScopeKey(
      user.id,
      targetUser.id,
      currentChannelId
    );
    const messageId = editingMessageId;
    const updatedText = message.trim();
    const updatedAt = new Date().toISOString();
    const existingMessage = messages.find(
      candidate => candidate.id === messageId
    );
    const restoreFailedEdit = () => {
      if (!isConversationScopeActive(conversationScopeKey)) {
        return;
      }

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

      if (!isConversationScopeActive(conversationScopeKey)) {
        return;
      }

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
    isConversationScopeActive,
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

      const conversationScopeKey = getConversationScopeKey(
        user.id,
        targetUser.id,
        currentChannelId
      );
      closeMessageMenu();
      const linkedCaptionMessageIds = getAttachmentCaptionMessageIds(
        messages,
        targetMessage
      );
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

        const broadcastTargetIds = getPersistedDeletedThreadMessageIds(
          deletedMessageIds,
          messageIdsToDelete
        );

        if (isConversationScopeActive(conversationScopeKey)) {
          broadcastTargetIds.forEach(deletedMessageId => {
            broadcastDeletedMessage(deletedMessageId);
          });
        }
        return true;
      } catch (error) {
        console.error('Error deleting message:', error);
        await reconcileMessagesFromServer({
          fallbackMessages: messagesSnapshot,
          conversationScopeKey,
        });
        if (
          !options?.suppressErrorToast &&
          isConversationScopeActive(conversationScopeKey)
        ) {
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
      isConversationScopeActive,
      messages,
      setEditingMessageId,
      setMessage,
      setMessages,
      targetUser,
      user,
      pendingSendRegistryRef,
      reconcileMessagesFromServer,
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

  const handleSendMessage = useCallback(async () => {
    if (editingMessageId) {
      await handleUpdateMessage();
      return;
    }

    await send.handleSendMessage();
  }, [editingMessageId, handleUpdateMessage, send]);

  const handleKeyPress = useCallback(
    (event: ReactKeyboardEvent) => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) {
        return;
      }

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
