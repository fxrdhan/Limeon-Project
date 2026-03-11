import { chatRuntimeState } from './chatRuntimeState';

const pendingReadReceiptStore = chatRuntimeState.pendingReadReceipts;
const pendingReadReceiptIdsByUser = pendingReadReceiptStore.value;

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
  pendingReadReceiptStore.hydrate();
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

  pendingReadReceiptStore.persist();
  pendingReadReceiptStore.notify();
  return true;
};

export const peekPendingReadReceiptMessageIds = (
  userId: string,
  limit = 200
) => {
  pendingReadReceiptStore.hydrate();
  if (!userId.trim()) {
    return [];
  }

  return [...getPendingMessageIdsForUser(userId)].slice(0, Math.max(1, limit));
};

export const ackPendingReadReceiptMessageIds = (
  userId: string,
  messageIds: string[]
) => {
  pendingReadReceiptStore.hydrate();
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
  pendingReadReceiptStore.persist();
  pendingReadReceiptStore.notify();
  return true;
};

export const hasPendingReadReceiptMessageIds = (userId?: string | null) => {
  pendingReadReceiptStore.hydrate();
  if (!userId) {
    return [...pendingReadReceiptIdsByUser.values()].some(
      messageIds => messageIds.size > 0
    );
  }

  return getPendingMessageIdsForUser(userId).size > 0;
};

export const subscribePendingReadReceiptQueue = (listener: () => void) => {
  return pendingReadReceiptStore.subscribe(listener);
};

export const resetPendingReadReceiptMessageIds = (userId?: string | null) => {
  pendingReadReceiptStore.hydrate();

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
  pendingReadReceiptStore.persist();
  pendingReadReceiptStore.notify();
};
