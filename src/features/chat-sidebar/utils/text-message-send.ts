import type { Dispatch, SetStateAction } from 'react';
import toast from 'react-hot-toast';
import { CHAT_SIDEBAR_TOASTER_ID } from '../constants';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import type {
  ChatSidebarPanelTargetUser,
  PendingSendRegistration,
} from '../types';
import { commitOptimisticMessage } from './optimistic-message';
import { createRuntimeId, createStableKey } from './runtime-id';

interface TextMessageParticipant {
  id: string;
  name: string;
}

interface SendTextChatMessageOptions {
  user: TextMessageParticipant;
  targetUser: ChatSidebarPanelTargetUser;
  currentChannelId: string;
  messageText: string;
  replyToId?: string | null;
  setMessage: Dispatch<SetStateAction<string>>;
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  scheduleScrollMessagesToBottom: () => void;
  triggerSendSuccessGlow: () => void;
  registerPendingSend: (tempMessageId: string) => PendingSendRegistration;
  isCurrentConversationScopeActive: () => boolean;
  runInCurrentConversationScope: (effect: () => void) => boolean;
  reconcileCurrentConversationMessages: () => Promise<void>;
}

export const sendTextChatMessage = async ({
  user,
  targetUser,
  currentChannelId,
  messageText,
  replyToId,
  setMessage,
  setMessages,
  scheduleScrollMessagesToBottom,
  triggerSendSuccessGlow,
  registerPendingSend,
  isCurrentConversationScopeActive,
  runInCurrentConversationScope,
  reconcileCurrentConversationMessages,
}: SendTextChatMessageOptions) => {
  const normalizedMessageText = messageText.trim();
  if (!normalizedMessageText) {
    return false;
  }

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
      await chatSidebarMessagesGateway.createMessage({
        receiver_id: targetUser.id,
        message: normalizedMessageText,
        message_type: 'text',
        ...(replyToId ? { reply_to_id: replyToId } : {}),
      });

    if (error || !newMessage) {
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
    }

    const realMessage: ChatMessage = {
      ...newMessage,
      sender_name: user.name || 'You',
      receiver_name: targetUser.name || 'Unknown',
      stableKey,
    };

    if (pendingSend.isCancelled()) {
      const { error: deleteError } =
        await chatSidebarMessagesGateway.deleteMessageThread(realMessage.id);

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
};
