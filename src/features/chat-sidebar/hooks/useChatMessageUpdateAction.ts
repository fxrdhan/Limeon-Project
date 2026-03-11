import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type { ChatSidebarPanelTargetUser } from '../types';

interface UseChatMessageUpdateActionProps {
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
  closeMessageMenu: () => void;
  focusMessageComposer: () => void;
  isCurrentConversationScopeActive: () => boolean;
  runInCurrentConversationScope: (effect: () => void) => boolean;
}

export const useChatMessageUpdateAction = ({
  user,
  targetUser,
  currentChannelId,
  messages,
  setMessages,
  message,
  setMessage,
  editingMessageId,
  setEditingMessageId,
  closeMessageMenu,
  focusMessageComposer,
  isCurrentConversationScopeActive,
  runInCurrentConversationScope,
}: UseChatMessageUpdateActionProps) => {
  const pendingEditComposerRestoreRef = useRef(false);

  useEffect(() => {
    if (
      pendingEditComposerRestoreRef.current &&
      (message.length > 0 || editingMessageId !== null)
    ) {
      pendingEditComposerRestoreRef.current = false;
    }
  }, [editingMessageId, message]);

  useEffect(() => {
    pendingEditComposerRestoreRef.current = false;
  }, [currentChannelId]);

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
      runInCurrentConversationScope(() => {
        if (existingMessage) {
          setMessages(previousMessages =>
            previousMessages.map(messageItem =>
              messageItem.id === messageId
                ? {
                    ...messageItem,
                    message: existingMessage.message,
                    updated_at: existingMessage.updated_at,
                  }
                : messageItem
            )
          );
        }

        if (pendingEditComposerRestoreRef.current) {
          pendingEditComposerRestoreRef.current = false;
          setEditingMessageId(messageId);
          setMessage(updatedText);
          requestAnimationFrame(focusMessageComposer);
        }

        toast.error('Gagal memperbarui pesan', {
          toasterId: CHAT_SIDEBAR_TOASTER_ID,
        });
      });
    };

    pendingEditComposerRestoreRef.current = true;
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

    try {
      const { data: updatedMessage, error } =
        await chatSidebarMessagesGateway.editTextMessage(messageId, {
          message: updatedText,
          updated_at: updatedAt,
        });

      if (!isCurrentConversationScopeActive()) {
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
      pendingEditComposerRestoreRef.current = false;
    } catch (error) {
      console.error('Error updating message:', error);
      restoreFailedEdit();
    }
  }, [
    closeMessageMenu,
    currentChannelId,
    editingMessageId,
    focusMessageComposer,
    isCurrentConversationScopeActive,
    message,
    messages,
    runInCurrentConversationScope,
    setEditingMessageId,
    setMessage,
    setMessages,
    targetUser,
    user,
  ]);

  return {
    handleUpdateMessage,
  };
};
