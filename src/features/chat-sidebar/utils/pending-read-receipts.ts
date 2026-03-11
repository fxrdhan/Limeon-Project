const PENDING_READ_RECEIPT_STORAGE_KEY = 'chat-pending-read-receipts';

const pendingReadReceiptIdsByUser = new Map<string, Set<string>>();
const pendingReadReceiptListeners = new Set<() => void>();
let hasHydratedPendingReadReceipts = false;

const canUseSessionStorage = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

const notifyPendingReadReceiptListeners = () => {
  pendingReadReceiptListeners.forEach(listener => {
    listener();
  });
};

const persistPendingReadReceiptIds = () => {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    const serializedPayload = Object.fromEntries(
      [...pendingReadReceiptIdsByUser.entries()].map(([userId, messageIds]) => [
        userId,
        [...messageIds],
      ])
    );
    window.sessionStorage.setItem(
      PENDING_READ_RECEIPT_STORAGE_KEY,
      JSON.stringify(serializedPayload)
    );
  } catch {
    // Ignore persistence failures. The in-memory queue still works.
  }
};

const hydratePendingReadReceiptIds = () => {
  if (hasHydratedPendingReadReceipts || !canUseSessionStorage()) {
    hasHydratedPendingReadReceipts = true;
    return;
  }

  hasHydratedPendingReadReceipts = true;

  try {
    const serializedIds = window.sessionStorage.getItem(
      PENDING_READ_RECEIPT_STORAGE_KEY
    );
    if (!serializedIds) {
      return;
    }

    const parsedPayload = JSON.parse(serializedIds);
    if (!parsedPayload || typeof parsedPayload !== 'object') {
      return;
    }

    Object.entries(parsedPayload).forEach(([userId, rawMessageIds]) => {
      if (!userId.trim() || !Array.isArray(rawMessageIds)) {
        return;
      }

      const normalizedMessageIds = rawMessageIds.filter(
        (messageId): messageId is string =>
          typeof messageId === 'string' && messageId.trim().length > 0
      );
      if (normalizedMessageIds.length === 0) {
        return;
      }

      pendingReadReceiptIdsByUser.set(userId, new Set(normalizedMessageIds));
    });
  } catch {
    // Ignore hydration failures and continue with an empty queue.
  }
};

const getPendingMessageIdsForUser = (userId: string) => {
  let messageIds = pendingReadReceiptIdsByUser.get(userId);
  if (!messageIds) {
    messageIds = new Set<string>();
    pendingReadReceiptIdsByUser.set(userId, messageIds);
  }

  return messageIds;
};

const pruneEmptyPendingReadReceiptUsers = () => {
  [...pendingReadReceiptIdsByUser.entries()].forEach(([userId, messageIds]) => {
    if (messageIds.size === 0) {
      pendingReadReceiptIdsByUser.delete(userId);
    }
  });
};

export const queuePendingReadReceiptMessageIds = (
  userId: string,
  messageIds: string[]
) => {
  hydratePendingReadReceiptIds();
  if (!userId.trim()) {
    return false;
  }

  const userMessageIds = getPendingMessageIdsForUser(userId);
  let hasChanges = false;

  messageIds.forEach(messageId => {
    const normalizedMessageId = messageId.trim();
    if (!normalizedMessageId || userMessageIds.has(normalizedMessageId)) {
      return;
    }

    userMessageIds.add(normalizedMessageId);
    hasChanges = true;
  });

  if (!hasChanges) {
    return false;
  }

  persistPendingReadReceiptIds();
  notifyPendingReadReceiptListeners();
  return true;
};

export const peekPendingReadReceiptMessageIds = (
  userId: string,
  limit = 200
) => {
  hydratePendingReadReceiptIds();
  if (!userId.trim()) {
    return [];
  }

  return [...getPendingMessageIdsForUser(userId)].slice(0, Math.max(1, limit));
};

export const ackPendingReadReceiptMessageIds = (
  userId: string,
  messageIds: string[]
) => {
  hydratePendingReadReceiptIds();
  if (!userId.trim()) {
    return false;
  }

  const userMessageIds = getPendingMessageIdsForUser(userId);
  let hasChanges = false;

  messageIds.forEach(messageId => {
    if (!userMessageIds.delete(messageId)) {
      return;
    }

    hasChanges = true;
  });

  if (!hasChanges) {
    return false;
  }

  pruneEmptyPendingReadReceiptUsers();
  persistPendingReadReceiptIds();
  notifyPendingReadReceiptListeners();
  return true;
};

export const hasPendingReadReceiptMessageIds = (userId?: string | null) => {
  hydratePendingReadReceiptIds();
  if (!userId) {
    return [...pendingReadReceiptIdsByUser.values()].some(
      messageIds => messageIds.size > 0
    );
  }

  return getPendingMessageIdsForUser(userId).size > 0;
};

export const subscribePendingReadReceiptQueue = (listener: () => void) => {
  hydratePendingReadReceiptIds();
  pendingReadReceiptListeners.add(listener);

  return () => {
    pendingReadReceiptListeners.delete(listener);
  };
};

export const resetPendingReadReceiptMessageIds = (userId?: string | null) => {
  hydratePendingReadReceiptIds();

  if (userId) {
    if (!pendingReadReceiptIdsByUser.delete(userId)) {
      return;
    }
  } else if (pendingReadReceiptIdsByUser.size === 0) {
    return;
  } else {
    pendingReadReceiptIdsByUser.clear();
  }

  pruneEmptyPendingReadReceiptUsers();
  persistPendingReadReceiptIds();
  notifyPendingReadReceiptListeners();
};
