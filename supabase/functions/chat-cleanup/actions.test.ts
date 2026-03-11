import { describe, expect, it, vi } from "vitest";
import type { ChatCleanupMessageRecord } from "../../../shared/chatStoragePaths.ts";
import {
  cleanupStoragePaths,
  deleteThreadAndCleanup,
  retryCleanupFailures,
  type ChatCleanupFailureRecord,
  type ChatCleanupRepository,
} from "./actions.ts";

const USER_ID = "user-1";

const buildParentMessage = (
  overrides: Partial<ChatCleanupMessageRecord> = {}
): ChatCleanupMessageRecord => ({
  id: overrides.id ?? "message-1",
  sender_id: overrides.sender_id ?? USER_ID,
  message: overrides.message ?? `documents/channel/${USER_ID}_report.pdf`,
  message_type: overrides.message_type ?? "file",
  file_name: overrides.file_name ?? "report.pdf",
  file_mime_type: overrides.file_mime_type ?? "application/pdf",
  file_preview_url:
    overrides.file_preview_url ??
    `/storage/v1/object/public/chat/previews/channel/${USER_ID}_report.png`,
  file_storage_path:
    overrides.file_storage_path ??
    `documents/channel/${USER_ID}_report.pdf`,
});

const createRepository = (overrides: {
  parentMessage?: ChatCleanupMessageRecord | null;
  parentMessageError?: string | null;
  deletedMessageIds?: string[];
  deleteMessageError?: string | null;
  failedStoragePaths?: string[];
  failures?: ChatCleanupFailureRecord[];
  failuresError?: string | null;
} = {}) => {
  const repository: ChatCleanupRepository = {
    getOwnedParentMessage: vi.fn(async () => ({
      message: overrides.parentMessage ?? buildParentMessage(),
      error: overrides.parentMessageError ?? null,
    })),
    deleteMessageThread: vi.fn(async () => ({
      deletedMessageIds: overrides.deletedMessageIds ?? ["message-1"],
      error: overrides.deleteMessageError ?? null,
    })),
    deleteStoragePaths: vi.fn(
      async () => overrides.failedStoragePaths ?? []
    ),
    recordCleanupFailure: vi.fn(async () => {}),
    listPendingCleanupFailures: vi.fn(async () => ({
      failures: overrides.failures ?? [],
      error: overrides.failuresError ?? null,
    })),
    resolveCleanupFailure: vi.fn(async () => {}),
    updateCleanupFailureAttempt: vi.fn(async () => {}),
  };

  return repository;
};

describe("chat-cleanup actions", () => {
  it("deletes a thread and skips failure recording when all storage paths are owned and removed", async () => {
    const repository = createRepository();

    const result = await deleteThreadAndCleanup({
      repository,
      userId: USER_ID,
      messageId: "message-1",
    });

    expect(result).toEqual({
      status: 200,
      body: {
        deletedMessageIds: ["message-1"],
        failedStoragePaths: [],
      },
    });
    expect(repository.deleteStoragePaths).toHaveBeenCalledWith([
      `documents/channel/${USER_ID}_report.pdf`,
      `previews/channel/${USER_ID}_report.png`,
    ]);
    expect(repository.recordCleanupFailure).not.toHaveBeenCalled();
  });

  it("records a cleanup failure when a deleted thread includes foreign storage paths", async () => {
    const repository = createRepository({
      parentMessage: buildParentMessage({
        file_preview_url:
          "/storage/v1/object/public/chat/previews/channel/user-2_report.png",
      }),
    });

    const result = await deleteThreadAndCleanup({
      repository,
      userId: USER_ID,
      messageId: "message-1",
    });

    expect(result).toEqual({
      status: 200,
      body: {
        deletedMessageIds: ["message-1"],
        failedStoragePaths: ["previews/channel/user-2_report.png"],
      },
    });
    expect(repository.recordCleanupFailure).toHaveBeenCalledWith({
      requestedBy: USER_ID,
      messageId: "message-1",
      failureStage: "delete_thread",
      storagePaths: ["previews/channel/user-2_report.png"],
      lastError:
        "Skipped chat storage cleanup for path(s) that do not belong to the sender",
    });
  });

  it("rejects cleanup_storage requests that contain foreign paths", async () => {
    const repository = createRepository();

    const result = await cleanupStoragePaths({
      repository,
      userId: USER_ID,
      storagePaths: [
        `documents/channel/${USER_ID}_report.pdf`,
        "documents/channel/user-2_report.pdf",
      ],
    });

    expect(result).toEqual({
      status: 403,
      body: { error: "Forbidden" },
    });
    expect(repository.deleteStoragePaths).not.toHaveBeenCalled();
    expect(repository.recordCleanupFailure).not.toHaveBeenCalled();
  });

  it("records cleanup_storage failures when storage deletion is only partially successful", async () => {
    const repository = createRepository({
      failedStoragePaths: [`documents/channel/${USER_ID}_report.pdf`],
    });

    const result = await cleanupStoragePaths({
      repository,
      userId: USER_ID,
      storagePaths: [`documents/channel/${USER_ID}_report.pdf`],
    });

    expect(result).toEqual({
      status: 200,
      body: {
        failedStoragePaths: [`documents/channel/${USER_ID}_report.pdf`],
      },
    });
    expect(repository.recordCleanupFailure).toHaveBeenCalledWith({
      requestedBy: USER_ID,
      messageId: null,
      failureStage: "cleanup_storage",
      storagePaths: [`documents/channel/${USER_ID}_report.pdf`],
      lastError: "Failed to fully clean up chat storage",
    });
  });

  it("resolves successful retries and updates the remaining failures", async () => {
    const repository = createRepository({
      failures: [
        {
          id: "failure-1",
          attempts: 1,
          storage_paths: [`documents/channel/${USER_ID}_report.pdf`],
        },
        {
          id: "failure-2",
          attempts: 2,
          storage_paths: ["previews/channel/user-2_report.png"],
        },
      ],
    });

    vi.mocked(repository.deleteStoragePaths)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await retryCleanupFailures({
      repository,
      userId: USER_ID,
    });

    expect(result).toEqual({
      status: 200,
      body: {
        resolvedCount: 1,
        remainingCount: 1,
      },
    });
    expect(repository.resolveCleanupFailure).toHaveBeenCalledWith("failure-1");
    expect(repository.updateCleanupFailureAttempt).toHaveBeenCalledWith(
      "failure-2",
      3,
      "Skipped chat storage cleanup for path(s) that do not belong to the sender"
    );
  });
});
