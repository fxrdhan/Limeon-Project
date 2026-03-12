import { useCallback } from 'react';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import { queueReadReceiptMessageIdsForSync } from '../utils/read-receipt-sync';
import { useChatReceiptMutationQueue } from './useChatReceiptMutationQueue';

const RECEIPT_RETRY_DELAY_MS = 1_200;

interface UseChatSessionReceiptsProps {
  applyMessageUpdate: (
    updatedMessage: Partial<ChatMessage> & { id: string }
  ) => void;
  currentUserId?: string | null;
  isSessionTokenActive: (sessionToken: number) => boolean;
  receiptScopeResetKey: string | null;
}

export const useChatSessionReceipts = ({
  applyMessageUpdate,
  currentUserId,
  isSessionTokenActive,
  receiptScopeResetKey,
}: UseChatSessionReceiptsProps) => {
  const mergeMessageUpdates = useCallback(
    (updatedMessages: ChatMessage[], sessionToken?: number) => {
      if (updatedMessages.length === 0) {
        return;
      }

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
  const runDeliveredMutation = useCallback(
    (messageIds: string[]) =>
      chatSidebarMessagesGateway.markMessageIdsAsDelivered(messageIds),
    []
  );
  const handleDeliveredMutationError = useCallback((error: unknown) => {
    console.error('Error marking messages as delivered:', error);
  }, []);

  const deliveredReceipts = useChatReceiptMutationQueue<ChatMessage>({
    scopeResetKey: receiptScopeResetKey
      ? `delivered::${receiptScopeResetKey}`
      : null,
    retryDelayMs: RECEIPT_RETRY_DELAY_MS,
    runMutation: runDeliveredMutation,
    applyUpdates: mergeMessageUpdates,
    isSessionTokenActive,
    onMutationError: handleDeliveredMutationError,
  });

  const markMessageIdsAsRead = useCallback(
    async (messageIds: string[], sessionToken?: number) => {
      const normalizedMessageIds = [...new Set(messageIds)]
        .map(messageId => messageId.trim())
        .filter(Boolean);
      if (normalizedMessageIds.length === 0) {
        return;
      }

      if (
        typeof sessionToken === 'number' &&
        !isSessionTokenActive(sessionToken)
      ) {
        return;
      }

      normalizedMessageIds.forEach(messageId => {
        applyMessageUpdate({
          id: messageId,
          is_read: true,
          is_delivered: true,
        });
      });
      if (currentUserId) {
        queueReadReceiptMessageIdsForSync(currentUserId, normalizedMessageIds);
      }
    },
    [applyMessageUpdate, currentUserId, isSessionTokenActive]
  );

  return {
    mergeMessageUpdates,
    markMessageIdsAsDelivered: deliveredReceipts.submitMessageIds,
    markMessageIdsAsRead,
  };
};
