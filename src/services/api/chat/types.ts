import type {
  ChatMessageInsertRow,
  ChatMessageRow,
  UserPresenceRow,
  UserPresenceUpdateRow,
} from '@/types/supabase-chat';
import type { OnlineUser } from '@/types';
import type {
  ChatPdfPreviewRequest as SharedChatPdfPreviewRequest,
  ChatPdfPreviewResponse as SharedChatPdfPreviewResponse,
  ChatPdfPreviewStatus,
  ChatForwardMessageResponse as SharedChatForwardMessageResponse,
  ChatSharedLinkResponse as SharedChatSharedLinkResponse,
  CleanupStoragePathsResponse as SharedCleanupStoragePathsResult,
  DeleteMessageThreadAndCleanupResponse as SharedDeleteMessageThreadAndCleanupResult,
  DeleteMessageThreadsAndCleanupResponse as SharedDeleteMessageThreadsAndCleanupResult,
  RetryChatCleanupFailuresResponse as SharedRetryChatCleanupFailuresResult,
} from '../../../../shared/chatFunctionContracts';

export const DEFAULT_CHAT_MESSAGES_PAGE_SIZE = 50;

export type ChatMessageType = 'text' | 'image' | 'file';
export type ChatFileKind = 'audio' | 'document';
export type ChatMessageRelationKind = 'attachment_caption';

type ChatMessageCoreFields = Pick<
  ChatMessageRow,
  'id' | 'sender_id' | 'receiver_id' | 'channel_id' | 'message' | 'reply_to_id'
>;

type ChatMessageOptionalMetadata = Partial<
  Pick<
    ChatMessageRow,
    | 'file_mime_type'
    | 'file_name'
    | 'file_preview_error'
    | 'file_preview_page_count'
    | 'file_preview_status'
    | 'file_preview_url'
    | 'file_size'
    | 'file_storage_path'
    | 'shared_link_slug'
    | 'is_delivered'
  >
>;

export type ChatMessage = ChatMessageCoreFields &
  ChatMessageOptionalMetadata & {
    created_at: string;
    updated_at: string;
    is_read: boolean;
    message_type: ChatMessageType;
    message_relation_kind?: ChatMessageRelationKind | null;
    file_kind?: ChatFileKind;
    sender_name?: string;
    receiver_name?: string;
    stableKey?: string;
  };

export type UserPresence = Omit<UserPresenceRow, 'is_online' | 'last_seen'> & {
  is_online: boolean;
  last_seen: string;
};

export interface PresenceSyncResult {
  errorMessage: string | null;
  ok: boolean;
}

export type ChatMessageInsertInput = Omit<
  ChatMessageInsertRow,
  'message_relation_kind' | 'message_type' | 'file_kind'
> & {
  message_type?: 'text' | 'image' | 'file';
  message_relation_kind?: 'attachment_caption' | null;
  file_kind?: 'audio' | 'document';
};

export type CreateChatMessageInput = Omit<
  ChatMessageInsertInput,
  'sender_id' | 'channel_id'
> & {
  receiver_id: string;
};

export interface EditChatMessageTextInput {
  message: string;
  updated_at?: string;
}

export interface ChatFilePreviewUpdateInput {
  file_preview_url?: string | null;
  file_preview_page_count?: number | null;
  file_preview_status?: ChatPdfPreviewStatus | null;
  file_preview_error?: string | null;
}

export type DeleteMessageThreadAndCleanupResult =
  SharedDeleteMessageThreadAndCleanupResult;

export type DeleteMessageThreadsAndCleanupResult =
  SharedDeleteMessageThreadsAndCleanupResult;

export type CleanupStoragePathsResult = SharedCleanupStoragePathsResult;

export type RetryChatCleanupFailuresResult =
  SharedRetryChatCleanupFailuresResult;

export type UserPresenceUpdateInput = Omit<
  UserPresenceUpdateRow,
  'is_online' | 'last_seen'
> & {
  is_online?: boolean;
  last_seen?: string;
};

export interface ConversationMessagesPage {
  messages: ChatMessage[];
  hasMore: boolean;
}

export interface ConversationSearchMessagesOptions {
  afterCreatedAt?: string | null;
  afterId?: string | null;
  limit?: number;
}

export interface ConversationSearchMessagesPage {
  messages: ChatMessage[];
  hasMore: boolean;
}

export interface UndeliveredIncomingMessageIdsPage {
  messageIds: string[];
  hasMore: boolean;
}

export interface ConversationSearchContextOptions {
  beforeLimit?: number;
  afterLimit?: number;
}

export interface ChatDirectoryUsersPage {
  users: OnlineUser[];
  hasMore: boolean;
}

export type PersistChatPdfPreviewInput = SharedChatPdfPreviewRequest;

export type PersistChatPdfPreviewResponse = SharedChatPdfPreviewResponse;

export interface PersistChatPdfPreviewResult {
  message: ChatMessage;
  previewPersisted: boolean;
}

export type ChatForwardMessageResult = SharedChatForwardMessageResponse;

export type ChatSharedLinkResult = SharedChatSharedLinkResponse;
