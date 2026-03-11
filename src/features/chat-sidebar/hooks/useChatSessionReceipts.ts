import { useCallback } from 'react';
import {
  chatSidebarMessagesGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';
import { useChatReceiptMutationQueue } from './useChatReceiptMutationQueue';

const RECEIPT_RETRY_DELAY_MS = 1_200;

interface UseChatSessionReceiptsProps {
  applyMessageUpdate: (
    updatedMessage: Partial<ChatMessage> & { id: string }
  ) => void;
  isSessionTokenActive: (sessionToken: number) => boolean;
  receiptScopeResetKey: string | null;
}

export const useChatSessionReceipts = ({
  applyMessageUpdate,
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
  const runReadMutation = useCallback(
    (messageIds: string[]) =>
      chatSidebarMessagesGateway.markMessageIdsAsRead(messageIds),
    []
  );
  const handleDeliveredMutationError = useCallback((error: unknown) => {
    console.error('Error marking messages as delivered:', error);
  }, []);
  const handleReadMutationError = useCallback((error: unknown) => {
    console.error('Error marking messages as read:', error);
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

  const readReceipts = useChatReceiptMutationQueue<ChatMessage>({
    scopeResetKey: receiptScopeResetKey
      ? `read::${receiptScopeResetKey}`
      : null,
    retryDelayMs: RECEIPT_RETRY_DELAY_MS,
    runMutation: runReadMutation,
    applyUpdates: mergeMessageUpdates,
    isSessionTokenActive,
    onMutationError: handleReadMutationError,
  });

  return {
    mergeMessageUpdates,
    markMessageIdsAsDelivered: deliveredReceipts.submitMessageIds,
    markMessageIdsAsRead: readReceipts.submitMessageIds,
  };
};
