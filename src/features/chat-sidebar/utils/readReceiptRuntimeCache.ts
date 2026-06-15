import { pendingReadReceiptsStore } from './chatRuntimeState';

const getPendingReadReceiptMessageIdsForUser = (
  userId: string,
  store = pendingReadReceiptsStore.value
) => {
  const normalizedUserId = userId.trim();
  let messageIds = store.get(normalizedUserId);
  if (!messageIds) {
    messageIds = new Set<string>();
    store.set(normalizedUserId, messageIds);
  }

  return messageIds;
};

const pruneEmptyPendingReadReceiptUsers = (
  store = pendingReadReceiptsStore.value
) => {
  [...store.entries()].forEach(([userId, messageIds]) => {
    if (messageIds.size === 0) {
      store.delete(userId);
    }
  });
};

export const readReceiptRuntimeCache = {
  queueMessageIds(userId: string, messageIds: string[]) {
    pendingReadReceiptsStore.hydrate();
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
      return false;
    }

    const userMessageIds =
      getPendingReadReceiptMessageIdsForUser(normalizedUserId);
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

    pendingReadReceiptsStore.persist();
    pendingReadReceiptsStore.notify();
    return true;
  },

  peekMessageIds(userId: string, limit = 200) {
    pendingReadReceiptsStore.hydrate();
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
      return [];
    }

    const userMessageIds = pendingReadReceiptsStore.value.get(normalizedUserId);

    return [...(userMessageIds ?? [])].slice(0, Math.max(1, limit));
  },

  ackMessageIds(userId: string, messageIds: string[]) {
    pendingReadReceiptsStore.hydrate();
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
      return false;
    }

    const userMessageIds = pendingReadReceiptsStore.value.get(normalizedUserId);
    if (!userMessageIds) {
      return false;
    }

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
    pendingReadReceiptsStore.persist();
    pendingReadReceiptsStore.notify();
    return true;
  },

  hasPendingMessageIds(userId?: string | null) {
    pendingReadReceiptsStore.hydrate();
    if (!userId) {
      return [...pendingReadReceiptsStore.value.values()].some(
        messageIds => messageIds.size > 0
      );
    }

    const normalizedUserId = userId.trim();
    if (!normalizedUserId) {
      return false;
    }

    return (
      (pendingReadReceiptsStore.value.get(normalizedUserId)?.size ?? 0) > 0
    );
  },

  subscribe(listener: () => void) {
    return pendingReadReceiptsStore.subscribe(listener);
  },

  reset(userId?: string | null) {
    pendingReadReceiptsStore.hydrate();

    if (userId) {
      const normalizedUserId = userId.trim();
      if (
        !normalizedUserId ||
        !pendingReadReceiptsStore.value.delete(normalizedUserId)
      ) {
        return;
      }
    } else if (pendingReadReceiptsStore.value.size === 0) {
      return;
    } else {
      pendingReadReceiptsStore.value.clear();
    }

    pruneEmptyPendingReadReceiptUsers();
    pendingReadReceiptsStore.persist();
    pendingReadReceiptsStore.notify();
  },
};
