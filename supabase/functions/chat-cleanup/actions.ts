import {
  type ChatCleanupMessageRecord,
  isOwnedChatPath,
  resolveChatMessageStoragePaths,
} from "../../../shared/chatStoragePaths.ts";
import type {
  CleanupStoragePathsResponse,
  DeleteMessageThreadAndCleanupResponse,
  DeleteMessageThreadsAndCleanupResponse,
  RetryChatCleanupFailuresResponse,
  ChatCleanupAction,
} from "../../../shared/chatFunctionContracts.ts";

export type CleanupAction = ChatCleanupAction;
export type CleanupFailureStage = "delete_thread" | "cleanup_storage";

export interface ChatCleanupFailureRecord {
  id: string;
  storage_paths?: string[] | null;
  attempts?: number | null;
}

export interface ChatCleanupRepository {
  getOwnedParentMessage: (
    messageId: string,
    userId: string
  ) => Promise<{ message: ChatCleanupMessageRecord | null; error: string | null }>;
  deleteMessageThread: (
    messageId: string
  ) => Promise<{ deletedMessageIds: string[]; error: string | null }>;
  deleteStoragePaths: (storagePaths: string[]) => Promise<string[]>;
  recordCleanupFailure: (params: {
    requestedBy: string;
    messageId?: string | null;
    failureStage: CleanupFailureStage;
    storagePaths: string[];
    lastError: string;
  }) => Promise<void>;
  listPendingCleanupFailures: (
    userId: string,
    limit: number
  ) => Promise<{ failures: ChatCleanupFailureRecord[]; error: string | null }>;
  resolveCleanupFailure: (failureId: string) => Promise<void>;
  updateCleanupFailureAttempt: (
    failureId: string,
    attempts: number,
    lastError: string,
    storagePaths?: string[]
  ) => Promise<void>;
}

export const normalizeStoragePaths = (storagePaths: Array<string | null | undefined>) =>
  [...new Set(storagePaths)]
    .map(storagePath => storagePath?.trim() || null)
    .filter((storagePath): storagePath is string => Boolean(storagePath));

export const partitionOwnedChatPaths = (storagePaths: string[], userId: string) => {
  const ownedStoragePaths: string[] = [];
  const foreignStoragePaths: string[] = [];

  normalizeStoragePaths(storagePaths).forEach(storagePath => {
    if (isOwnedChatPath(storagePath, userId)) {
      ownedStoragePaths.push(storagePath);
      return;
    }

    foreignStoragePaths.push(storagePath);
  });

  return {
    ownedStoragePaths,
    foreignStoragePaths,
  };
};

const normalizeDeletedMessageIds = (deletedMessageIds: string[]) =>
  deletedMessageIds.filter(
    (deletedMessageId): deletedMessageId is string =>
      typeof deletedMessageId === "string" && deletedMessageId.length > 0
  );

const normalizeMessageIds = (messageIds: Array<string | null | undefined>) =>
  [...new Set(messageIds)]
    .map(messageId => messageId?.trim() || null)
    .filter((messageId): messageId is string => Boolean(messageId));

export const deleteThreadAndCleanup = async ({
  repository,
  userId,
  messageId,
}: {
  repository: ChatCleanupRepository;
  userId: string;
  messageId?: string | null;
}) => {
  const normalizedMessageId = messageId?.trim();
  if (!normalizedMessageId) {
    return {
      status: 400,
      body: { error: "messageId is required" },
    };
  }

  const { message: parentMessage, error: parentMessageError } =
    await repository.getOwnedParentMessage(normalizedMessageId, userId);

  if (parentMessageError) {
    return {
      status: 500,
      body: { error: parentMessageError },
    };
  }

  if (!parentMessage || parentMessage.sender_id !== userId) {
    return {
      status: 403,
      body: { error: "Forbidden" },
    };
  }

  const storagePaths = resolveChatMessageStoragePaths(parentMessage);
  const { ownedStoragePaths, foreignStoragePaths } = partitionOwnedChatPaths(
    storagePaths,
    userId
  );

  const { deletedMessageIds, error: deleteError } =
    await repository.deleteMessageThread(normalizedMessageId);

  if (deleteError) {
    return {
      status: 500,
      body: { error: deleteError },
    };
  }

  const deletedOwnedStoragePaths =
    ownedStoragePaths.length > 0
      ? await repository.deleteStoragePaths(ownedStoragePaths)
      : [];
  const failedStoragePaths = normalizeStoragePaths([
    ...foreignStoragePaths,
    ...deletedOwnedStoragePaths,
  ]);

  if (deletedOwnedStoragePaths.length > 0) {
    await repository.recordCleanupFailure({
      requestedBy: userId,
      messageId: normalizedMessageId,
      failureStage: "delete_thread",
      storagePaths: deletedOwnedStoragePaths,
      lastError: "Failed to fully clean up chat storage after deleting a thread",
    });
  }

  return {
    status: 200,
    body: {
      deletedMessageIds: normalizeDeletedMessageIds(deletedMessageIds),
      failedStoragePaths,
    } satisfies DeleteMessageThreadAndCleanupResponse,
  };
};

export const deleteThreadsAndCleanup = async ({
  repository,
  userId,
  messageIds,
}: {
  repository: ChatCleanupRepository;
  userId: string;
  messageIds?: Array<string | null | undefined>;
}) => {
  const normalizedMessageIds = normalizeMessageIds(messageIds ?? []);
  if (normalizedMessageIds.length === 0) {
    return {
      status: 400,
      body: { error: "messageIds is required" },
    };
  }

  const deletedMessageIds = new Set<string>();
  const deletedTargetMessageIds: string[] = [];
  const failedTargetMessageIds: string[] = [];
  const cleanupWarningTargetMessageIds: string[] = [];
  const failedStoragePaths: string[] = [];
  const BATCH_SIZE = 4;

  for (
    let messageIndex = 0;
    messageIndex < normalizedMessageIds.length;
    messageIndex += BATCH_SIZE
  ) {
    const batchMessageIds = normalizedMessageIds.slice(
      messageIndex,
      messageIndex + BATCH_SIZE
    );
    const batchResults = await Promise.all(
      batchMessageIds.map(async messageId => ({
        messageId,
        result: await deleteThreadAndCleanup({
          repository,
          userId,
          messageId,
        }),
      }))
    );

    batchResults.forEach(({ messageId, result }) => {
      if (result.status !== 200) {
        failedTargetMessageIds.push(messageId);
        return;
      }

      const resolvedDeletedMessageIds =
        "deletedMessageIds" in result.body
          ? normalizeDeletedMessageIds(result.body.deletedMessageIds)
          : [];
      if (resolvedDeletedMessageIds.length === 0) {
        failedTargetMessageIds.push(messageId);
        return;
      }

      resolvedDeletedMessageIds.forEach(deletedMessageId => {
        deletedMessageIds.add(deletedMessageId);
      });
      deletedTargetMessageIds.push(messageId);

      const resolvedFailedStoragePaths =
        "failedStoragePaths" in result.body
          ? normalizeStoragePaths(result.body.failedStoragePaths)
          : [];
      if (resolvedFailedStoragePaths.length === 0) {
        return;
      }

      cleanupWarningTargetMessageIds.push(messageId);
      failedStoragePaths.push(...resolvedFailedStoragePaths);
    });
  }

  return {
    status: 200,
    body: {
      deletedMessageIds: [...deletedMessageIds],
      deletedTargetMessageIds,
      failedTargetMessageIds,
      cleanupWarningTargetMessageIds,
      failedStoragePaths: normalizeStoragePaths(failedStoragePaths),
    } satisfies DeleteMessageThreadsAndCleanupResponse,
  };
};

export const cleanupStoragePaths = async ({
  repository,
  userId,
  storagePaths,
}: {
  repository: ChatCleanupRepository;
  userId: string;
  storagePaths?: Array<string | null | undefined>;
}) => {
  const normalizedStoragePaths = normalizeStoragePaths(storagePaths ?? []);
  if (normalizedStoragePaths.length === 0) {
    return {
      status: 200,
      body: { failedStoragePaths: [] },
    };
  }

  const hasForeignPath = normalizedStoragePaths.some(
    storagePath => !isOwnedChatPath(storagePath, userId)
  );
  if (hasForeignPath) {
    return {
      status: 403,
      body: { error: "Forbidden" },
    };
  }

  const failedStoragePaths =
    await repository.deleteStoragePaths(normalizedStoragePaths);

  if (failedStoragePaths.length > 0) {
    await repository.recordCleanupFailure({
      requestedBy: userId,
      messageId: null,
      failureStage: "cleanup_storage",
      storagePaths: failedStoragePaths,
      lastError: "Failed to fully clean up chat storage",
    });
  }

  return {
    status: 200,
    body: { failedStoragePaths } satisfies CleanupStoragePathsResponse,
  };
};

export const retryCleanupFailures = async ({
  repository,
  userId,
}: {
  repository: ChatCleanupRepository;
  userId: string;
}) => {
  const { failures, error } = await repository.listPendingCleanupFailures(
    userId,
    20
  );
  if (error) {
    return {
      status: 500,
      body: { error },
    };
  }

  let resolvedCount = 0;
  let remainingCount = failures.length;
  let skippedCount = 0;

  for (const failure of failures) {
    const { ownedStoragePaths, foreignStoragePaths } = partitionOwnedChatPaths(
      failure.storage_paths ?? [],
      userId
    );
    const hasForeignStoragePaths = foreignStoragePaths.length > 0;

    if (ownedStoragePaths.length === 0) {
      resolvedCount += 1;
      remainingCount -= 1;
      if (hasForeignStoragePaths) {
        skippedCount += 1;
      }
      await repository.resolveCleanupFailure(failure.id);
      continue;
    }

    const retriedOwnedStoragePaths =
      ownedStoragePaths.length > 0
        ? await repository.deleteStoragePaths(ownedStoragePaths)
        : [];
    const failedStoragePaths = normalizeStoragePaths(retriedOwnedStoragePaths);

    if (failedStoragePaths.length === 0) {
      resolvedCount += 1;
      remainingCount -= 1;
      if (hasForeignStoragePaths) {
        skippedCount += 1;
      }
      await repository.resolveCleanupFailure(failure.id);
      continue;
    }

    await repository.updateCleanupFailureAttempt(
      failure.id,
      (failure.attempts ?? 0) + 1,
      "Failed to fully clean up chat storage during retry",
      failedStoragePaths
    );
  }

  return {
    status: 200,
    body: {
      resolvedCount,
      remainingCount,
      skippedCount,
    } satisfies RetryChatCleanupFailuresResponse,
  };
};
