import {
  ackPendingReadReceiptMessageIds,
  hasPendingReadReceiptMessageIds,
  peekPendingReadReceiptMessageIds,
  queuePendingReadReceiptMessageIds,
  subscribePendingReadReceiptQueue,
} from './pending-read-receipts';

const normalizeReadReceiptMessageIds = (messageIds: string[]) =>
  [...new Set(messageIds)].map(messageId => messageId.trim()).filter(Boolean);

export const queueReadReceiptMessageIdsForSync = (
  userId: string,
  messageIds: string[]
) => {
  const normalizedMessageIds = normalizeReadReceiptMessageIds(messageIds);

  if (!userId.trim() || normalizedMessageIds.length === 0) {
    return [];
  }

  queuePendingReadReceiptMessageIds(userId, normalizedMessageIds);
  return normalizedMessageIds;
};

export const getPendingReadReceiptBatch = (userId: string, limit = 200) => {
  if (!userId.trim()) {
    return [];
  }

  return peekPendingReadReceiptMessageIds(userId, limit);
};

interface FlushPendingReadReceiptBatchResult {
  error: unknown;
  hasMore: boolean;
  messageIds: string[];
  status: 'empty' | 'retry' | 'synced';
}

export { subscribePendingReadReceiptQueue };

export const flushPendingReadReceiptBatch = async ({
  userId,
  limit = 200,
  submitBatch,
}: {
  userId: string;
  limit?: number;
  submitBatch: (messageIds: string[]) => Promise<{
    error: unknown;
  }>;
}): Promise<FlushPendingReadReceiptBatchResult> => {
  const pendingMessageIds = getPendingReadReceiptBatch(userId, limit);
  if (pendingMessageIds.length === 0) {
    return {
      error: null,
      hasMore: false,
      messageIds: [],
      status: 'empty',
    };
  }

  const { error } = await submitBatch(pendingMessageIds);
  if (error) {
    return {
      error,
      hasMore: true,
      messageIds: pendingMessageIds,
      status: 'retry',
    };
  }

  ackPendingReadReceiptMessageIds(userId, pendingMessageIds);

  return {
    error: null,
    hasMore: hasPendingReadReceiptMessageIds(userId),
    messageIds: pendingMessageIds,
    status: 'synced',
  };
};

export const sendPendingReadReceiptKeepalive = ({
  userId,
  limit = 200,
  sendKeepalive,
}: {
  userId: string;
  limit?: number;
  sendKeepalive: (messageIds: string[]) => boolean;
}) => {
  const pendingMessageIds = getPendingReadReceiptBatch(userId, limit);
  if (pendingMessageIds.length === 0) {
    return false;
  }

  return sendKeepalive(pendingMessageIds);
};
