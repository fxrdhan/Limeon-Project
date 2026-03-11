import type {
  CreateChatMessageRpcArgs,
  DeleteChatMessageThreadRpcArgs,
  EditChatMessageTextRpcArgs,
  FetchChatMessageContextRpcArgs,
  FetchChatMessagesPageRpcArgs,
  GetChatMessageByIdRpcArgs,
  GetUserPresenceRpcArgs,
  ListActiveUserPresenceSinceRpcArgs,
  ListUndeliveredIncomingMessageIdsRpcArgs,
  MarkChatMessageIdsAsDeliveredRpcArgs,
  MarkChatMessageIdsAsReadRpcArgs,
  SearchChatMessagesRpcArgs,
  SyncUserPresenceOnExitRpcArgs,
  UpdateChatFilePreviewMetadataRpcArgs,
  UpsertUserPresenceRpcArgs,
} from '@/types/supabase-chat';
import type {
  ChatFilePreviewUpdateInput,
  ConversationSearchContextOptions,
  ConversationSearchMessagesOptions,
  CreateChatMessageInput,
  EditChatMessageTextInput,
  UserPresenceUpdateInput,
} from './types';

export const CHAT_RPC_NAMES = {
  createMessage: 'create_chat_message',
  deleteMessageThread: 'delete_chat_message_thread',
  editMessageText: 'edit_chat_message_text',
  fetchMessageContext: 'fetch_chat_message_context',
  fetchMessagesPage: 'fetch_chat_messages_page',
  getMessageById: 'get_chat_message_by_id',
  getUserPresence: 'get_user_presence',
  listActiveUserPresenceSince: 'list_active_user_presence_since',
  listUndeliveredIncomingMessageIds: 'list_undelivered_incoming_message_ids',
  markMessageIdsAsDelivered: 'mark_chat_message_ids_as_delivered',
  markMessageIdsAsRead: 'mark_chat_message_ids_as_read',
  searchMessages: 'search_chat_messages',
  syncUserPresenceOnExit: 'sync_user_presence_on_exit',
  updateFilePreviewMetadata: 'update_chat_file_preview_metadata',
  upsertUserPresence: 'upsert_user_presence',
} as const;

export const buildFetchChatMessagesPageRpcArgs = (
  targetUserId: string,
  options?: {
    beforeCreatedAt?: string | null;
    beforeId?: string | null;
    limit?: number;
  }
): FetchChatMessagesPageRpcArgs => ({
  p_target_user_id: targetUserId,
  p_before_created_at: options?.beforeCreatedAt ?? null,
  p_before_id: options?.beforeId ?? null,
  p_limit: options?.limit,
});

export const buildGetChatMessageByIdRpcArgs = (
  messageId: string
): GetChatMessageByIdRpcArgs => ({
  p_message_id: messageId,
});

export const buildSearchChatMessagesRpcArgs = (
  targetUserId: string,
  query: string,
  options?: ConversationSearchMessagesOptions
): SearchChatMessagesRpcArgs => ({
  p_target_user_id: targetUserId,
  p_query: query,
  p_limit: options?.limit,
  p_after_created_at: options?.afterCreatedAt ?? null,
  p_after_id: options?.afterId ?? null,
});

export const buildFetchChatMessageContextRpcArgs = (
  targetUserId: string,
  messageId: string,
  options?: ConversationSearchContextOptions
): FetchChatMessageContextRpcArgs => ({
  p_target_user_id: targetUserId,
  p_message_id: messageId,
  p_before_limit: options?.beforeLimit ?? 20,
  p_after_limit: options?.afterLimit ?? 20,
});

export const buildCreateChatMessageRpcArgs = (
  payload: CreateChatMessageInput
): CreateChatMessageRpcArgs => ({
  p_receiver_id: payload.receiver_id,
  p_message: payload.message,
  p_message_type: payload.message_type ?? 'text',
  p_reply_to_id: payload.reply_to_id ?? null,
  p_message_relation_kind: payload.message_relation_kind ?? null,
  p_file_name: payload.file_name ?? null,
  p_file_kind: payload.file_kind ?? null,
  p_file_mime_type: payload.file_mime_type ?? null,
  p_file_size: payload.file_size ?? null,
  p_file_storage_path: payload.file_storage_path ?? null,
});

export const buildEditChatMessageTextRpcArgs = (
  id: string,
  payload: EditChatMessageTextInput
): EditChatMessageTextRpcArgs => ({
  p_message_id: id,
  p_message: payload.message,
  p_updated_at: payload.updated_at ?? new Date().toISOString(),
});

export const buildUpdateChatFilePreviewMetadataRpcArgs = (
  id: string,
  payload: ChatFilePreviewUpdateInput
): UpdateChatFilePreviewMetadataRpcArgs => ({
  p_message_id: id,
  p_file_preview_url: payload.file_preview_url ?? null,
  p_file_preview_page_count: payload.file_preview_page_count ?? null,
  p_file_preview_status: payload.file_preview_status ?? null,
  p_file_preview_error: payload.file_preview_error ?? null,
});

export const buildMarkChatMessageIdsAsDeliveredRpcArgs = (
  messageIds: string[]
): MarkChatMessageIdsAsDeliveredRpcArgs => ({
  p_message_ids: messageIds,
});

export const buildMarkChatMessageIdsAsReadRpcArgs = (
  messageIds: string[]
): MarkChatMessageIdsAsReadRpcArgs => ({
  p_message_ids: messageIds,
});

export const buildListUndeliveredIncomingMessageIdsRpcArgs = (options?: {
  limit?: number;
  offset?: number;
}): ListUndeliveredIncomingMessageIdsRpcArgs => ({
  p_limit: options?.limit,
  p_offset: options?.offset ?? 0,
});

export const buildDeleteChatMessageThreadRpcArgs = (
  id: string
): DeleteChatMessageThreadRpcArgs => ({
  p_message_id: id,
});

export const buildGetUserPresenceRpcArgs = (
  userId: string
): GetUserPresenceRpcArgs => ({
  p_user_id: userId,
});

export const buildUpsertUserPresenceRpcArgs = (
  userId: string,
  payload: Pick<UserPresenceUpdateInput, 'is_online'>
): UpsertUserPresenceRpcArgs => ({
  p_user_id: userId,
  p_is_online:
    typeof payload.is_online === 'boolean' ? payload.is_online : null,
  p_last_chat_opened: null,
});

export const buildSyncUserPresenceOnExitRpcArgs = (
  userId: string,
  payload: UserPresenceUpdateInput
): SyncUserPresenceOnExitRpcArgs => ({
  p_user_id: userId,
  p_is_online:
    typeof payload.is_online === 'boolean' ? payload.is_online : null,
  p_last_seen: payload.last_seen ?? null,
});

export const buildListActiveUserPresenceSinceRpcArgs = (
  since: string
): ListActiveUserPresenceSinceRpcArgs => ({
  p_since: since,
});
