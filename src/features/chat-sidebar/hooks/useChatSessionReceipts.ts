import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';
import {
  chatSidebarGateway,
  type ChatMessage,
} from '../data/chatSidebarGateway';

const RECEIPT_RETRY_DELAY_MS = 1_200;

type ReceiptRetryQueue = Map<string, number | undefined>;

const queueReceiptRetryIds = (
  retryQueue: ReceiptRetryQueue,
  messageIds: string[],
  sessionToken?: number
) => {
  messageIds.forEach(messageId => {
    if (!messageId) {
      return;
    }

    const queuedSessionToken = retryQueue.get(messageId);
    if (
      typeof queuedSessionToken !== 'number' &&
      typeof sessionToken === 'number'
    ) {
      retryQueue.set(messageId, sessionToken);
      return;
    }

    if (!retryQueue.has(messageId)) {
      retryQueue.set(messageId, sessionToken);
    }
  });
};

const takeReceiptRetryGroups = (retryQueue: ReceiptRetryQueue) => {
  const retryGroups = new Map<
    string,
    {
      messageIds: string[];
      sessionToken?: number;
    }
  >();

  retryQueue.forEach((sessionToken, messageId) => {
    const retryGroupKey =
      typeof sessionToken === 'number' ? `token:${sessionToken}` : 'none';
    const existingRetryGroup = retryGroups.get(retryGroupKey);

    if (existingRetryGroup) {
      existingRetryGroup.messageIds.push(messageId);
      return;
    }

    retryGroups.set(retryGroupKey, {
      messageIds: [messageId],
      sessionToken,
    });
  });

  retryQueue.clear();

  return [...retryGroups.values()];
};

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
  const pendingDeliveredReceiptMessageIdsRef = useRef<Set<string>>(new Set());
  const pendingReadReceiptMessageIdsRef = useRef<Set<string>>(new Set());
  const deliveredRetryQueueRef = useRef<ReceiptRetryQueue>(new Map());
  const readRetryQueueRef = useRef<ReceiptRetryQueue>(new Map());
  const deliveredRetryTimeoutRef = useRef<number | null>(null);
  const readRetryTimeoutRef = useRef<number | null>(null);
  const retryDeliveredReceiptHandlerRef = useRef<
    (messageIds: string[], sessionToken?: number) => Promise<void>
  >(async () => {});
  const retryReadReceiptHandlerRef = useRef<
    (messageIds: string[], sessionToken?: number) => Promise<void>
  >(async () => {});
  const receiptScopeVersionRef = useRef(0);

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

  const clearRetryTimer = useCallback(
    (retryTimeoutRef: MutableRefObject<number | null>) => {
      if (retryTimeoutRef.current === null) {
        return;
      }

      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    },
    []
  );

  const resetReceiptState = useCallback(() => {
    pendingDeliveredReceiptMessageIdsRef.current.clear();
    pendingReadReceiptMessageIdsRef.current.clear();
    deliveredRetryQueueRef.current.clear();
    readRetryQueueRef.current.clear();
    clearRetryTimer(deliveredRetryTimeoutRef);
    clearRetryTimer(readRetryTimeoutRef);
  }, [clearRetryTimer]);

  useEffect(() => {
    receiptScopeVersionRef.current += 1;
    resetReceiptState();

    return () => {
      receiptScopeVersionRef.current += 1;
      resetReceiptState();
    };
  }, [receiptScopeResetKey, resetReceiptState]);

  const scheduleDeliveredRetry = useCallback(() => {
    if (deliveredRetryTimeoutRef.current !== null) {
      return;
    }

    deliveredRetryTimeoutRef.current = window.setTimeout(() => {
      deliveredRetryTimeoutRef.current = null;

      const retryGroups = takeReceiptRetryGroups(
        deliveredRetryQueueRef.current
      );
      retryGroups.forEach(({ messageIds, sessionToken }) => {
        void retryDeliveredReceiptHandlerRef.current(messageIds, sessionToken);
      });
    }, RECEIPT_RETRY_DELAY_MS);
  }, []);

  const scheduleReadRetry = useCallback(() => {
    if (readRetryTimeoutRef.current !== null) {
      return;
    }

    readRetryTimeoutRef.current = window.setTimeout(() => {
      readRetryTimeoutRef.current = null;

      const retryGroups = takeReceiptRetryGroups(readRetryQueueRef.current);
      retryGroups.forEach(({ messageIds, sessionToken }) => {
        void retryReadReceiptHandlerRef.current(messageIds, sessionToken);
      });
    }, RECEIPT_RETRY_DELAY_MS);
  }, []);

  const markMessageIdsAsDelivered = useCallback(
    async (messageIds: string[], sessionToken?: number) => {
      if (messageIds.length === 0) return;

      const receiptScopeVersion = receiptScopeVersionRef.current;
      const targetIds = messageIds.filter(messageId => {
        if (!messageId) return false;
        if (pendingDeliveredReceiptMessageIdsRef.current.has(messageId)) {
          return false;
        }
        if (deliveredRetryQueueRef.current.has(messageId)) {
          queueReceiptRetryIds(
            deliveredRetryQueueRef.current,
            [messageId],
            sessionToken
          );
          return false;
        }
        pendingDeliveredReceiptMessageIdsRef.current.add(messageId);
        return true;
      });
      if (targetIds.length === 0) return;

      try {
        const { data: deliveredMessages, error } =
          await chatSidebarGateway.markMessageIdsAsDelivered(targetIds);
        if (receiptScopeVersion !== receiptScopeVersionRef.current) {
          return;
        }

        if (error) {
          queueReceiptRetryIds(
            deliveredRetryQueueRef.current,
            targetIds,
            sessionToken
          );
          scheduleDeliveredRetry();
          return;
        }

        mergeMessageUpdates(deliveredMessages || [], sessionToken);
      } catch (error) {
        console.error('Error marking messages as delivered:', error);
        if (receiptScopeVersion === receiptScopeVersionRef.current) {
          queueReceiptRetryIds(
            deliveredRetryQueueRef.current,
            targetIds,
            sessionToken
          );
          scheduleDeliveredRetry();
        }
      } finally {
        targetIds.forEach(messageId => {
          pendingDeliveredReceiptMessageIdsRef.current.delete(messageId);
        });
      }
    },
    [mergeMessageUpdates, scheduleDeliveredRetry]
  );
  retryDeliveredReceiptHandlerRef.current = markMessageIdsAsDelivered;

  const markMessageIdsAsRead = useCallback(
    async (messageIds: string[], sessionToken?: number) => {
      if (messageIds.length === 0) return;

      const receiptScopeVersion = receiptScopeVersionRef.current;
      const targetIds = messageIds.filter(messageId => {
        if (!messageId) return false;
        if (pendingReadReceiptMessageIdsRef.current.has(messageId)) {
          return false;
        }
        if (readRetryQueueRef.current.has(messageId)) {
          queueReceiptRetryIds(
            readRetryQueueRef.current,
            [messageId],
            sessionToken
          );
          return false;
        }
        pendingReadReceiptMessageIdsRef.current.add(messageId);
        return true;
      });
      if (targetIds.length === 0) return;

      try {
        const { data: readMessages, error } =
          await chatSidebarGateway.markMessageIdsAsRead(targetIds);
        if (receiptScopeVersion !== receiptScopeVersionRef.current) {
          return;
        }

        if (error) {
          queueReceiptRetryIds(
            readRetryQueueRef.current,
            targetIds,
            sessionToken
          );
          scheduleReadRetry();
          return;
        }

        mergeMessageUpdates(readMessages || [], sessionToken);
      } catch (error) {
        console.error('Error marking messages as read:', error);
        if (receiptScopeVersion === receiptScopeVersionRef.current) {
          queueReceiptRetryIds(
            readRetryQueueRef.current,
            targetIds,
            sessionToken
          );
          scheduleReadRetry();
        }
      } finally {
        targetIds.forEach(messageId => {
          pendingReadReceiptMessageIdsRef.current.delete(messageId);
        });
      }
    },
    [mergeMessageUpdates, scheduleReadRetry]
  );
  retryReadReceiptHandlerRef.current = markMessageIdsAsRead;

  return {
    mergeMessageUpdates,
    markMessageIdsAsDelivered,
    markMessageIdsAsRead,
  };
};
