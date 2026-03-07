import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useRef } from 'react';
import {
  chatSidebarGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';

interface UseChatSessionReceiptsProps {
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  broadcastConversationUpdate: (message: ChatMessage) => void;
  broadcastReceiptUpdate: (message: ChatMessage) => void;
  isSessionTokenActive: (sessionToken: number) => boolean;
}

export const useChatSessionReceipts = ({
  setMessages,
  broadcastConversationUpdate,
  broadcastReceiptUpdate,
  isSessionTokenActive,
}: UseChatSessionReceiptsProps) => {
  const pendingDeliveredReceiptMessageIdsRef = useRef<Set<string>>(new Set());
  const pendingReadReceiptMessageIdsRef = useRef<Set<string>>(new Set());

  const applyMessageUpdate = useCallback(
    (updatedMessage: Partial<ChatMessage> & { id: string }) => {
      setMessages(previousMessages =>
        previousMessages.map(previousMessage =>
          previousMessage.id === updatedMessage.id
            ? {
                ...previousMessage,
                ...updatedMessage,
                stableKey: previousMessage.stableKey,
              }
            : previousMessage
        )
      );
    },
    [setMessages]
  );

  const mergeAndBroadcastMessageUpdates = useCallback(
    (updatedMessages: ChatMessage[], sessionToken?: number) => {
      if (updatedMessages.length === 0) return;
      if (
        typeof sessionToken === 'number' &&
        !isSessionTokenActive(sessionToken)
      ) {
        return;
      }

      updatedMessages.forEach(updatedMessage => {
        applyMessageUpdate(updatedMessage);
        broadcastConversationUpdate(updatedMessage);
        broadcastReceiptUpdate(updatedMessage);
      });
    },
    [
      applyMessageUpdate,
      broadcastConversationUpdate,
      broadcastReceiptUpdate,
      isSessionTokenActive,
    ]
  );

  const markMessageIdsAsDelivered = useCallback(
    async (messageIds: string[], sessionToken?: number) => {
      if (messageIds.length === 0) return;

      const targetIds = messageIds.filter(messageId => {
        if (!messageId) return false;
        if (pendingDeliveredReceiptMessageIdsRef.current.has(messageId)) {
          return false;
        }
        pendingDeliveredReceiptMessageIdsRef.current.add(messageId);
        return true;
      });
      if (targetIds.length === 0) return;

      try {
        const { data: deliveredMessages, error } =
          await chatSidebarGateway.markMessageIdsAsDelivered(targetIds);
        if (error || !deliveredMessages || deliveredMessages.length === 0) {
          return;
        }

        mergeAndBroadcastMessageUpdates(deliveredMessages, sessionToken);
      } catch (error) {
        console.error('Error marking messages as delivered:', error);
      } finally {
        targetIds.forEach(messageId => {
          pendingDeliveredReceiptMessageIdsRef.current.delete(messageId);
        });
      }
    },
    [mergeAndBroadcastMessageUpdates]
  );

  const markMessageIdsAsRead = useCallback(
    async (messageIds: string[], sessionToken?: number) => {
      if (messageIds.length === 0) return;

      const targetIds = messageIds.filter(messageId => {
        if (!messageId) return false;
        if (pendingReadReceiptMessageIdsRef.current.has(messageId)) {
          return false;
        }
        pendingReadReceiptMessageIdsRef.current.add(messageId);
        return true;
      });
      if (targetIds.length === 0) return;

      try {
        const { data: readMessages, error } =
          await chatSidebarGateway.markMessageIdsAsRead(targetIds);
        if (error || !readMessages || readMessages.length === 0) return;
        mergeAndBroadcastMessageUpdates(readMessages, sessionToken);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      } finally {
        targetIds.forEach(messageId => {
          pendingReadReceiptMessageIdsRef.current.delete(messageId);
        });
      }
    },
    [mergeAndBroadcastMessageUpdates]
  );

  return {
    applyMessageUpdate,
    mergeAndBroadcastMessageUpdates,
    markMessageIdsAsDelivered,
    markMessageIdsAsRead,
  };
};
