import { useCallback, useEffect, useRef } from 'react';

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

interface UseChatReceiptMutationQueueProps<T extends { id: string }> {
  scopeResetKey: string | null;
  retryDelayMs: number;
  runMutation: (
    messageIds: string[]
  ) => Promise<{ data: T[] | null; error: unknown }>;
  applyUpdates?: (updatedMessages: T[], sessionToken?: number) => void;
  isSessionTokenActive?: (sessionToken: number) => boolean;
  onMutationError?: (error: unknown) => void;
}

export const useChatReceiptMutationQueue = <T extends { id: string }>({
  scopeResetKey,
  retryDelayMs,
  runMutation,
  applyUpdates,
  isSessionTokenActive,
  onMutationError,
}: UseChatReceiptMutationQueueProps<T>) => {
  const pendingMessageIdsRef = useRef<Set<string>>(new Set());
  const retryQueueRef = useRef<ReceiptRetryQueue>(new Map());
  const retryTimeoutRef = useRef<number | null>(null);
  const retryHandlerRef = useRef<
    (messageIds: string[], sessionToken?: number) => Promise<void>
  >(async () => {});
  const scopeVersionRef = useRef(0);

  const clearRetryTimer = useCallback(() => {
    if (retryTimeoutRef.current === null) {
      return;
    }

    window.clearTimeout(retryTimeoutRef.current);
    retryTimeoutRef.current = null;
  }, []);

  const resetMutationState = useCallback(() => {
    pendingMessageIdsRef.current.clear();
    retryQueueRef.current.clear();
    clearRetryTimer();
  }, [clearRetryTimer]);

  useEffect(() => {
    scopeVersionRef.current += 1;
    resetMutationState();

    return () => {
      scopeVersionRef.current += 1;
      resetMutationState();
    };
  }, [resetMutationState, scopeResetKey]);

  const scheduleRetry = useCallback(() => {
    if (retryTimeoutRef.current !== null) {
      return;
    }

    retryTimeoutRef.current = window.setTimeout(() => {
      retryTimeoutRef.current = null;

      const retryGroups = takeReceiptRetryGroups(retryQueueRef.current);
      retryGroups.forEach(({ messageIds, sessionToken }) => {
        void retryHandlerRef.current(messageIds, sessionToken);
      });
    }, retryDelayMs);
  }, [retryDelayMs]);

  const submitMessageIds = useCallback(
    async (messageIds: string[], sessionToken?: number) => {
      if (messageIds.length === 0) {
        return;
      }

      const scopeVersion = scopeVersionRef.current;
      const targetIds = messageIds.filter(messageId => {
        if (!messageId) {
          return false;
        }

        if (pendingMessageIdsRef.current.has(messageId)) {
          return false;
        }

        if (retryQueueRef.current.has(messageId)) {
          queueReceiptRetryIds(
            retryQueueRef.current,
            [messageId],
            sessionToken
          );
          return false;
        }

        pendingMessageIdsRef.current.add(messageId);
        return true;
      });
      if (targetIds.length === 0) {
        return;
      }

      try {
        const { data, error } = await runMutation(targetIds);
        if (scopeVersion !== scopeVersionRef.current) {
          return;
        }

        if (error) {
          queueReceiptRetryIds(retryQueueRef.current, targetIds, sessionToken);
          onMutationError?.(error);
          scheduleRetry();
          return;
        }

        if (
          typeof sessionToken === 'number' &&
          isSessionTokenActive &&
          !isSessionTokenActive(sessionToken)
        ) {
          return;
        }

        applyUpdates?.(data || [], sessionToken);
      } catch (error) {
        if (scopeVersion === scopeVersionRef.current) {
          queueReceiptRetryIds(retryQueueRef.current, targetIds, sessionToken);
          onMutationError?.(error);
          scheduleRetry();
        }
      } finally {
        targetIds.forEach(messageId => {
          pendingMessageIdsRef.current.delete(messageId);
        });
      }
    },
    [
      applyUpdates,
      isSessionTokenActive,
      onMutationError,
      runMutation,
      scheduleRetry,
    ]
  );

  retryHandlerRef.current = submitMessageIds;

  return {
    submitMessageIds,
    resetMutationState,
  };
};
