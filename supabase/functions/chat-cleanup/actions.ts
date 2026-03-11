import {
  type ChatCleanupMessageRecord,
  isOwnedChatPath,
  resolveChatMessageStoragePaths,
} from "../../../shared/chatStoragePaths.ts";

export type CleanupAction = "delete_thread" | "cleanup_storage" | "retry_failures";
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
    lastError: string
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

  if (failedStoragePaths.length > 0) {
    await repository.recordCleanupFailure({
      requestedBy: userId,
      messageId: normalizedMessageId,
      failureStage: "delete_thread",
      storagePaths: failedStoragePaths,
      lastError:
        foreignStoragePaths.length > 0
          ? "Skipped chat storage cleanup for path(s) that do not belong to the sender"
          : "Failed to fully clean up chat storage after deleting a thread",
    });
  }

  return {
    status: 200,
    body: {
      deletedMessageIds: normalizeDeletedMessageIds(deletedMessageIds),
      failedStoragePaths,
    },
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
    body: { failedStoragePaths },
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

  for (const failure of failures) {
    const { ownedStoragePaths, foreignStoragePaths } = partitionOwnedChatPaths(
      failure.storage_paths ?? [],
      userId
    );
    const retriedOwnedStoragePaths =
      ownedStoragePaths.length > 0
        ? await repository.deleteStoragePaths(ownedStoragePaths)
        : [];
    const failedStoragePaths = normalizeStoragePaths([
      ...foreignStoragePaths,
      ...retriedOwnedStoragePaths,
    ]);

    if (failedStoragePaths.length === 0) {
      resolvedCount += 1;
      remainingCount -= 1;
      await repository.resolveCleanupFailure(failure.id);
      continue;
    }

    await repository.updateCleanupFailureAttempt(
      failure.id,
      (failure.attempts ?? 0) + 1,
      foreignStoragePaths.length > 0
        ? "Skipped chat storage cleanup for path(s) that do not belong to the sender"
        : "Failed to fully clean up chat storage during retry"
    );
  }

  return {
    status: 200,
    body: {
      resolvedCount,
      remainingCount,
    },
  };
};
