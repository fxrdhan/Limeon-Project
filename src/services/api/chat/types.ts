import type {
  ChatMessageInsertRow,
  ChatMessageRow,
  UserPresenceUpdateRow,
} from '@/types/supabase-chat';

export const DEFAULT_CHAT_MESSAGES_PAGE_SIZE = 50;

export type ChatMessage = Pick<
  ChatMessageRow,
  'id' | 'sender_id' | 'receiver_id' | 'channel_id' | 'message' | 'reply_to_id'
> &
  Partial<
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
    >
  > & {
    created_at: string;
    updated_at: string;
    is_read: boolean;
    is_delivered?: boolean;
    message_relation_kind?: 'attachment_caption' | null;
    message_type: 'text' | 'image' | 'file';
    file_kind?: 'audio' | 'document';
    sender_name?: string;
    receiver_name?: string;
    stableKey?: string;
  };

export interface UserPresence {
  user_id: string;
  is_online: boolean;
  last_seen: string;
  updated_at?: string | null;
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
  file_preview_status?: 'pending' | 'ready' | 'failed' | null;
  file_preview_error?: string | null;
}

export interface DeleteMessageThreadAndCleanupResult {
  deletedMessageIds: string[];
  failedStoragePaths: string[];
}

export interface CleanupStoragePathsResult {
  failedStoragePaths: string[];
}

export interface RetryChatCleanupFailuresResult {
  resolvedCount: number;
  remainingCount: number;
}

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

export interface UndeliveredIncomingMessageIdsPage {
  messageIds: string[];
  hasMore: boolean;
}

export interface ConversationSearchContextOptions {
  beforeLimit?: number;
  afterLimit?: number;
}
