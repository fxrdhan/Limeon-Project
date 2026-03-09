import { useCallback, useRef } from 'react';
import {
  chatSidebarGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';

interface UseChatSessionReceiptsProps {
  applyMessageUpdate: (
    updatedMessage: Partial<ChatMessage> & { id: string }
  ) => void;
  isSessionTokenActive: (sessionToken: number) => boolean;
}

export const useChatSessionReceipts = ({
  applyMessageUpdate,
  isSessionTokenActive,
}: UseChatSessionReceiptsProps) => {
  const pendingDeliveredReceiptMessageIdsRef = useRef<Set<string>>(new Set());
  const pendingReadReceiptMessageIdsRef = useRef<Set<string>>(new Set());

  const mergeMessageUpdates = useCallback(
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
      });
    },
    [applyMessageUpdate, isSessionTokenActive]
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

        mergeMessageUpdates(deliveredMessages, sessionToken);
      } catch (error) {
        console.error('Error marking messages as delivered:', error);
      } finally {
        targetIds.forEach(messageId => {
          pendingDeliveredReceiptMessageIdsRef.current.delete(messageId);
        });
      }
    },
    [mergeMessageUpdates]
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
        mergeMessageUpdates(readMessages, sessionToken);
      } catch (error) {
        console.error('Error marking messages as read:', error);
      } finally {
        targetIds.forEach(messageId => {
          pendingReadReceiptMessageIdsRef.current.delete(messageId);
        });
      }
    },
    [mergeMessageUpdates]
  );

  return {
    mergeMessageUpdates,
    markMessageIdsAsDelivered,
    markMessageIdsAsRead,
  };
};
