import type {
  ChatFunctionArgs,
  ChatFunctionReturn,
  ChatTableInsert,
  ChatTableRow,
  ChatTableUpdate,
} from './supabase-chat.generated';

export type ChatMessageRow = ChatTableRow<'chat_messages'>;
export type ChatMessageInsertRow = ChatTableInsert<'chat_messages'>;
export type ChatMessageUpdateRow = ChatTableUpdate<'chat_messages'>;

export type ChatSharedLinkRow = ChatTableRow<'chat_shared_links'>;
export type ChatSharedLinkInsertRow = ChatTableInsert<'chat_shared_links'>;
export type ChatSharedLinkUpdateRow = ChatTableUpdate<'chat_shared_links'>;

export type UserPresenceRow = ChatTableRow<'user_presence'>;
export type UserPresenceInsertRow = ChatTableInsert<'user_presence'>;
export type UserPresenceUpdateRow = ChatTableUpdate<'user_presence'>;

export type CreateChatMessageRpcArgs = ChatFunctionArgs<'create_chat_message'>;
export type CreateChatMessageRpcReturn =
  ChatFunctionReturn<'create_chat_message'>;

export type DeleteChatMessageThreadRpcArgs =
  ChatFunctionArgs<'delete_chat_message_thread'>;
export type DeleteChatMessageThreadRpcReturn =
  ChatFunctionReturn<'delete_chat_message_thread'>;

export type EditChatMessageTextRpcArgs =
  ChatFunctionArgs<'edit_chat_message_text'>;
export type EditChatMessageTextRpcReturn =
  ChatFunctionReturn<'edit_chat_message_text'>;

export type FetchChatMessageContextRpcArgs =
  ChatFunctionArgs<'fetch_chat_message_context'>;
export type FetchChatMessageContextRpcReturn =
  ChatFunctionReturn<'fetch_chat_message_context'>;

export type GetChatMessageByIdRpcArgs =
  ChatFunctionArgs<'get_chat_message_by_id'>;
export type GetChatMessageByIdRpcReturn =
  ChatFunctionReturn<'get_chat_message_by_id'>;

export type GetUserPresenceRpcArgs = ChatFunctionArgs<'get_user_presence'>;
export type GetUserPresenceRpcReturn = ChatFunctionReturn<'get_user_presence'>;

export type FetchChatMessagesPageRpcArgs =
  ChatFunctionArgs<'fetch_chat_messages_page'>;
export type FetchChatMessagesPageRpcReturn =
  ChatFunctionReturn<'fetch_chat_messages_page'>;

export type GenerateChatSharedLinkSlugRpcArgs =
  ChatFunctionArgs<'generate_chat_shared_link_slug'>;
export type GenerateChatSharedLinkSlugRpcReturn =
  ChatFunctionReturn<'generate_chat_shared_link_slug'>;

export type ListActiveUserPresenceSinceRpcArgs =
  ChatFunctionArgs<'list_active_user_presence_since'>;
export type ListActiveUserPresenceSinceRpcReturn =
  ChatFunctionReturn<'list_active_user_presence_since'>;

export type ListUndeliveredIncomingMessageIdsRpcArgs =
  ChatFunctionArgs<'list_undelivered_incoming_message_ids'>;
export type ListUndeliveredIncomingMessageIdsRpcReturn =
  ChatFunctionReturn<'list_undelivered_incoming_message_ids'>;

export type MarkChatMessageIdsAsDeliveredRpcArgs =
  ChatFunctionArgs<'mark_chat_message_ids_as_delivered'>;
export type MarkChatMessageIdsAsDeliveredRpcReturn =
  ChatFunctionReturn<'mark_chat_message_ids_as_delivered'>;

export type MarkChatMessageIdsAsReadRpcArgs =
  ChatFunctionArgs<'mark_chat_message_ids_as_read'>;
export type MarkChatMessageIdsAsReadRpcReturn =
  ChatFunctionReturn<'mark_chat_message_ids_as_read'>;

export type SearchChatMessagesRpcArgs =
  ChatFunctionArgs<'search_chat_messages'>;
export type SearchChatMessagesRpcReturn =
  ChatFunctionReturn<'search_chat_messages'>;

export type SyncUserPresenceOnExitRpcArgs =
  ChatFunctionArgs<'sync_user_presence_on_exit'>;
export type SyncUserPresenceOnExitRpcReturn =
  ChatFunctionReturn<'sync_user_presence_on_exit'>;

export type UpdateChatFilePreviewMetadataRpcArgs =
  ChatFunctionArgs<'update_chat_file_preview_metadata'>;
export type UpdateChatFilePreviewMetadataRpcReturn =
  ChatFunctionReturn<'update_chat_file_preview_metadata'>;

export type UpsertUserPresenceRpcArgs =
  ChatFunctionArgs<'upsert_user_presence'>;
export type UpsertUserPresenceRpcReturn =
  ChatFunctionReturn<'upsert_user_presence'>;
