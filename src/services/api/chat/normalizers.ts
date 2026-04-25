import type { DirectoryUser } from "@/store/createDirectoryStore";
import type { ChatMessageRow, UserPresenceRow } from "@/types/supabase-chat";
import type {
  ChatDirectoryUser,
  ChatForwardMessageResult,
  ChatMessage,
  ChatMessageRelationKind,
  ChatMessageType,
  CleanupStoragePathsResult,
  DeleteMessageThreadAndCleanupResult,
  DeleteMessageThreadsAndCleanupResult,
  RetryChatCleanupFailuresResult,
  UserPresence,
} from "./types";
import { invariantChatContract } from "./contractErrors";

const getRequiredNonEmptyString = (value: string | null | undefined, fieldName: string): string => {
  invariantChatContract(
    typeof value === "string" && value.trim().length > 0,
    `Chat contract violation: ${fieldName} is required.`,
  );

  return value;
};

const getRequiredString = (value: string | null | undefined, fieldName: string): string => {
  invariantChatContract(
    typeof value === "string",
    `Chat contract violation: ${fieldName} must be a string.`,
  );

  return value;
};

const getOptionalString = (value: string | null | undefined, fieldName: string) => {
  invariantChatContract(
    value === null || value === undefined || typeof value === "string",
    `Chat contract violation: ${fieldName} must be a string or null.`,
  );

  return value ?? null;
};

const getRequiredNonNegativeNumber = (value: number | null | undefined, fieldName: string) => {
  invariantChatContract(
    typeof value === "number" && Number.isFinite(value) && value >= 0,
    `Chat contract violation: ${fieldName} must be a non-negative number.`,
  );

  return value;
};

const getRequiredTimestamp = (
  fieldName: string,
  ...candidates: Array<string | null | undefined>
): string => {
  const timestampCandidate = candidates.find(
    (candidate) => typeof candidate === "string" && candidate.trim().length > 0,
  );

  invariantChatContract(timestampCandidate, `Chat contract violation: ${fieldName} is required.`);

  return timestampCandidate;
};

const normalizeStringList = (
  values: Array<string | null | undefined> | null | undefined,
  fieldName: string,
) => {
  invariantChatContract(
    values === null || values === undefined || Array.isArray(values),
    `Chat contract violation: ${fieldName} must be an array.`,
  );

  return [...new Set(values ?? [])].flatMap((value, valueIndex) => {
    invariantChatContract(
      value === null || value === undefined || typeof value === "string",
      `Chat contract violation: ${fieldName}[${valueIndex}] must be a string.`,
    );

    const normalizedValue = value?.trim();
    return normalizedValue ? [normalizedValue] : [];
  });
};

const normalizeChatMessageType = (value: string | null | undefined): ChatMessageType => {
  if (value === "text" || value === "image" || value === "file") {
    return value;
  }

  invariantChatContract(
    false,
    "Chat contract violation: message_type must be text, image, or file.",
  );
};

const normalizeChatMessageRelationKind = (
  value: string | null | undefined,
): ChatMessageRelationKind | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value === "attachment_caption") {
    return value;
  }

  invariantChatContract(false, "Chat contract violation: message_relation_kind is invalid.");
};

const normalizeChatFileKind = (value: string | null | undefined) => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (value === "audio" || value === "document") {
    return value;
  }

  invariantChatContract(false, "Chat contract violation: file_kind is invalid.");
};

const normalizeChatPreviewStatus = (value: string | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value === "pending" || value === "ready" || value === "failed") {
    return value;
  }

  invariantChatContract(false, "Chat contract violation: file_preview_status is invalid.");
};

export const normalizeChatMessage = (
  message: Partial<ChatMessageRow> | null | undefined,
): ChatMessage | null => {
  if (message === null || message === undefined) {
    return null;
  }

  const normalizedCreatedAt = getRequiredTimestamp(
    "created_at",
    message.created_at,
    message.updated_at,
  );
  const normalizedUpdatedAt = getRequiredTimestamp(
    "updated_at",
    message.updated_at,
    normalizedCreatedAt,
  );

  return {
    id: getRequiredNonEmptyString(message.id, "id"),
    sender_id: getRequiredNonEmptyString(message.sender_id, "sender_id"),
    receiver_id: getRequiredNonEmptyString(message.receiver_id, "receiver_id"),
    channel_id: getRequiredNonEmptyString(message.channel_id, "channel_id"),
    message: getRequiredString(message.message, "message"),
    reply_to_id: message.reply_to_id ?? null,
    created_at: normalizedCreatedAt,
    updated_at: normalizedUpdatedAt,
    is_read: Boolean(message.is_read),
    is_delivered: typeof message.is_delivered === "boolean" ? message.is_delivered : false,
    message_type: normalizeChatMessageType(message.message_type),
    message_relation_kind: normalizeChatMessageRelationKind(message.message_relation_kind),
    file_name: message.file_name ?? null,
    file_kind: normalizeChatFileKind(message.file_kind),
    file_mime_type: message.file_mime_type ?? null,
    file_size: typeof message.file_size === "number" ? message.file_size : null,
    file_storage_path: message.file_storage_path ?? null,
    file_preview_url: message.file_preview_url ?? null,
    file_preview_page_count:
      typeof message.file_preview_page_count === "number" ? message.file_preview_page_count : null,
    file_preview_status: normalizeChatPreviewStatus(message.file_preview_status),
    file_preview_error: message.file_preview_error ?? null,
    shared_link_slug: message.shared_link_slug ?? null,
  };
};

export const normalizeChatMessages = (
  messages: Array<Partial<ChatMessageRow>> | null | undefined,
) =>
  (messages ?? []).flatMap((message, messageIndex) => {
    try {
      invariantChatContract(
        message !== null && message !== undefined,
        `Chat contract violation: messages[${messageIndex}] is required.`,
      );

      const normalizedMessage = normalizeChatMessage(message);
      return normalizedMessage ? [normalizedMessage] : [];
    } catch (error) {
      console.warn("Skipping malformed chat message row", error);
      return [];
    }
  });

export const normalizeRealtimeChatMessage = (
  message: Partial<ChatMessageRow> | null | undefined,
) => {
  try {
    return normalizeChatMessage(message);
  } catch (error) {
    console.warn("Skipping malformed realtime chat message row", error);
    return null;
  }
};

export const extractRealtimeChatMessageId = (
  message: Pick<Partial<ChatMessageRow>, "id"> | null | undefined,
) => {
  const messageId = message?.id;
  return typeof messageId === "string" && messageId.length > 0 ? messageId : null;
};

export const normalizeUserPresence = (
  presence: Partial<UserPresenceRow> | null | undefined,
): UserPresence | null => {
  if (presence === null || presence === undefined) {
    return null;
  }

  return {
    id: getRequiredNonEmptyString(presence.id, "presence.id"),
    user_id: getRequiredNonEmptyString(presence.user_id, "presence.user_id"),
    is_online: Boolean(presence.is_online),
    last_seen: getRequiredTimestamp("presence.last_seen", presence.last_seen, presence.updated_at),
    last_chat_opened: presence.last_chat_opened ?? null,
    updated_at: presence.updated_at ?? null,
  };
};

export const normalizeUserPresenceList = (
  presences: Array<Partial<UserPresenceRow>> | null | undefined,
) =>
  (presences ?? []).flatMap((presence, presenceIndex) => {
    invariantChatContract(
      presence !== null && presence !== undefined,
      `Chat contract violation: presences[${presenceIndex}] is required.`,
    );

    const normalizedPresence = normalizeUserPresence(presence);
    return normalizedPresence ? [normalizedPresence] : [];
  });

export const normalizeChatDirectoryUser = (
  user: Partial<DirectoryUser> | null | undefined,
): ChatDirectoryUser | null => {
  if (user === null || user === undefined) {
    return null;
  }

  return {
    id: getRequiredNonEmptyString(user.id, "directory_user.id"),
    name: getRequiredString(user.name, "directory_user.name"),
    email: getRequiredString(user.email, "directory_user.email"),
    profilephoto: getOptionalString(user.profilephoto, "directory_user.profilephoto"),
    profilephoto_thumb: getOptionalString(
      user.profilephoto_thumb,
      "directory_user.profilephoto_thumb",
    ),
  };
};

export const normalizeChatDirectoryUsers = (
  users: Array<Partial<DirectoryUser>> | null | undefined,
) =>
  (users ?? []).flatMap((user, userIndex) => {
    invariantChatContract(
      user !== null && user !== undefined,
      `Chat contract violation: directory_users[${userIndex}] is required.`,
    );

    const normalizedUser = normalizeChatDirectoryUser(user);
    return normalizedUser ? [normalizedUser] : [];
  });

export const normalizeDeleteMessageThreadAndCleanupResult = (
  result: Partial<DeleteMessageThreadAndCleanupResult> | null | undefined,
): DeleteMessageThreadAndCleanupResult => ({
  deletedMessageIds: normalizeStringList(result?.deletedMessageIds, "cleanup.deletedMessageIds"),
  failedStoragePaths: normalizeStringList(result?.failedStoragePaths, "cleanup.failedStoragePaths"),
});

export const normalizeDeleteMessageThreadsAndCleanupResult = (
  result: Partial<DeleteMessageThreadsAndCleanupResult> | null | undefined,
): DeleteMessageThreadsAndCleanupResult => ({
  deletedMessageIds: normalizeStringList(result?.deletedMessageIds, "cleanup.deletedMessageIds"),
  deletedTargetMessageIds: normalizeStringList(
    result?.deletedTargetMessageIds,
    "cleanup.deletedTargetMessageIds",
  ),
  failedTargetMessageIds: normalizeStringList(
    result?.failedTargetMessageIds,
    "cleanup.failedTargetMessageIds",
  ),
  cleanupWarningTargetMessageIds: normalizeStringList(
    result?.cleanupWarningTargetMessageIds,
    "cleanup.cleanupWarningTargetMessageIds",
  ),
  failedStoragePaths: normalizeStringList(result?.failedStoragePaths, "cleanup.failedStoragePaths"),
});

export const normalizeCleanupStoragePathsResult = (
  result: Partial<CleanupStoragePathsResult> | null | undefined,
): CleanupStoragePathsResult => ({
  failedStoragePaths: normalizeStringList(result?.failedStoragePaths, "cleanup.failedStoragePaths"),
});

export const normalizeRetryChatCleanupFailuresResult = (
  result: Partial<RetryChatCleanupFailuresResult> | null | undefined,
): RetryChatCleanupFailuresResult => ({
  resolvedCount: getRequiredNonNegativeNumber(result?.resolvedCount, "cleanup.resolvedCount"),
  remainingCount: getRequiredNonNegativeNumber(result?.remainingCount, "cleanup.remainingCount"),
  skippedCount: getRequiredNonNegativeNumber(result?.skippedCount, "cleanup.skippedCount"),
});

export const normalizeChatForwardMessageResult = (
  result: Partial<ChatForwardMessageResult> | null | undefined,
): ChatForwardMessageResult => ({
  forwardedRecipientIds: normalizeStringList(
    result?.forwardedRecipientIds,
    "forward.forwardedRecipientIds",
  ),
  failedRecipientIds: normalizeStringList(result?.failedRecipientIds, "forward.failedRecipientIds"),
});
