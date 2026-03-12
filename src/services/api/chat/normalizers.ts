import type { ChatMessageRow, UserPresenceRow } from '@/types/supabase-chat';
import type {
  ChatMessage,
  ChatMessageRelationKind,
  ChatMessageType,
  UserPresence,
} from './types';

const DEFAULT_TIMESTAMP = '1970-01-01T00:00:00.000Z';

const normalizeTimestamp = (
  ...candidates: Array<string | null | undefined>
) => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return DEFAULT_TIMESTAMP;
};

const normalizeChatMessageType = (
  value: string | null | undefined
): ChatMessageType => {
  if (value === 'image' || value === 'file') {
    return value;
  }

  return 'text';
};

const normalizeChatMessageRelationKind = (
  value: string | null | undefined
): ChatMessageRelationKind | null => {
  if (value === 'attachment_caption') {
    return value;
  }

  return null;
};

export const normalizeChatMessage = (
  message: Partial<ChatMessageRow> | null | undefined
): ChatMessage | null => {
  if (!message?.id) {
    return null;
  }

  const normalizedCreatedAt = normalizeTimestamp(
    message.created_at,
    message.updated_at
  );

  return {
    id: message.id,
    sender_id: message.sender_id ?? '',
    receiver_id: message.receiver_id ?? '',
    channel_id: message.channel_id ?? '',
    message: message.message ?? '',
    reply_to_id: message.reply_to_id ?? null,
    created_at: normalizedCreatedAt,
    updated_at: normalizeTimestamp(message.updated_at, normalizedCreatedAt),
    is_read: Boolean(message.is_read),
    is_delivered:
      typeof message.is_delivered === 'boolean' ? message.is_delivered : false,
    message_type: normalizeChatMessageType(message.message_type),
    message_relation_kind: normalizeChatMessageRelationKind(
      message.message_relation_kind
    ),
    file_name: message.file_name ?? null,
    file_kind:
      message.file_kind === 'audio' || message.file_kind === 'document'
        ? message.file_kind
        : undefined,
    file_mime_type: message.file_mime_type ?? null,
    file_size: typeof message.file_size === 'number' ? message.file_size : null,
    file_storage_path: message.file_storage_path ?? null,
    file_preview_url: message.file_preview_url ?? null,
    file_preview_page_count:
      typeof message.file_preview_page_count === 'number'
        ? message.file_preview_page_count
        : null,
    file_preview_status:
      message.file_preview_status === 'pending' ||
      message.file_preview_status === 'ready' ||
      message.file_preview_status === 'failed'
        ? message.file_preview_status
        : null,
    file_preview_error: message.file_preview_error ?? null,
  };
};

export const normalizeChatMessages = (
  messages: Array<Partial<ChatMessageRow>> | null | undefined
) =>
  (messages ?? []).flatMap(message => {
    const normalizedMessage = normalizeChatMessage(message);
    return normalizedMessage ? [normalizedMessage] : [];
  });

export const normalizeRealtimeChatMessage = (
  message: Partial<ChatMessageRow> | null | undefined
) => normalizeChatMessage(message);

export const extractRealtimeChatMessageId = (
  message: Pick<Partial<ChatMessageRow>, 'id'> | null | undefined
) => {
  const messageId = message?.id;
  return typeof messageId === 'string' && messageId.length > 0
    ? messageId
    : null;
};

export const normalizeUserPresence = (
  presence: Partial<UserPresenceRow> | null | undefined
): UserPresence | null => {
  if (!presence?.user_id) {
    return null;
  }

  return {
    id: presence.id ?? '',
    user_id: presence.user_id,
    is_online: Boolean(presence.is_online),
    last_seen: normalizeTimestamp(presence.last_seen, presence.updated_at),
    last_chat_opened: presence.last_chat_opened ?? null,
    updated_at: presence.updated_at ?? null,
  };
};

export const normalizeUserPresenceList = (
  presences: Array<Partial<UserPresenceRow>> | null | undefined
) =>
  (presences ?? []).flatMap(presence => {
    const normalizedPresence = normalizeUserPresence(presence);
    return normalizedPresence ? [normalizedPresence] : [];
  });
