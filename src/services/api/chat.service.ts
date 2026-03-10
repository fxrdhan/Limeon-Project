import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from './base.service';
import type {
  ChatMessageInsertRow,
  ChatMessageRow,
  UserPresenceUpdateRow,
} from '@/types/supabase-chat';

const DEFAULT_CHAT_MESSAGES_PAGE_SIZE = 50;

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
    // Virtual fields for display
    sender_name?: string;
    receiver_name?: string;
    // Stable key for consistent animation during optimistic updates
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

const buildUserPresenceRestUrl = (userId: string) => {
  const requestUrl = new URL(`${supabaseUrl}/rest/v1/user_presence`);
  requestUrl.searchParams.set('user_id', `eq.${userId}`);
  return requestUrl.toString();
};

const updateUserPresenceRow = async (
  userId: string,
  payload: UserPresenceUpdateInput
): Promise<ServiceResponse<UserPresence[]>> => {
  try {
    const { data, error } = await supabase
      .from('user_presence')
      .update(payload)
      .eq('user_id', userId)
      .select();

    if (error) {
      return { data: null, error };
    }

    return { data: (data || []) as UserPresence[], error: null };
  } catch (error) {
    return { data: null, error: error as PostgrestError };
  }
};

export const chatService = {
  async getMessageById(id: string): Promise<ServiceResponse<ChatMessage>> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        return { data: null, error };
      }

      return {
        data: data ? (data as ChatMessage) : null,
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async fetchMessagesBetweenUsers(
    targetUserId: string,
    options?: {
      beforeCreatedAt?: string | null;
      beforeId?: string | null;
      limit?: number;
    }
  ): Promise<ServiceResponse<ConversationMessagesPage>> {
    try {
      const pageSize = Math.max(
        1,
        options?.limit ?? DEFAULT_CHAT_MESSAGES_PAGE_SIZE
      );
      const { data, error } = await supabase.rpc('fetch_chat_messages_page', {
        p_target_user_id: targetUserId,
        p_before_created_at: options?.beforeCreatedAt ?? null,
        p_before_id: options?.beforeId ?? null,
        p_limit: pageSize + 1,
      });

      if (error) {
        return { data: null, error };
      }

      const orderedMessages = ((data || []) as ChatMessage[]).slice(
        0,
        pageSize
      );
      const hasMore = (data?.length ?? 0) > pageSize;

      return {
        data: {
          messages: orderedMessages.reverse(),
          hasMore,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async searchConversationMessages(
    targetUserId: string,
    query: string,
    limit = 200
  ): Promise<ServiceResponse<ChatMessage[]>> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return { data: [], error: null };
    }

    try {
      const { data, error } = await supabase.rpc('search_chat_messages', {
        p_target_user_id: targetUserId,
        p_query: normalizedQuery,
        p_limit: limit,
      });

      if (error) {
        return { data: null, error };
      }

      return { data: (data || []) as ChatMessage[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async fetchConversationMessageContext(
    targetUserId: string,
    messageId: string,
    options?: ConversationSearchContextOptions
  ): Promise<ServiceResponse<ChatMessage[]>> {
    try {
      const { data, error } = await supabase.rpc('fetch_chat_message_context', {
        p_target_user_id: targetUserId,
        p_message_id: messageId,
        p_before_limit: options?.beforeLimit ?? 20,
        p_after_limit: options?.afterLimit ?? 20,
      });

      if (error) {
        return { data: null, error };
      }

      return { data: (data || []) as ChatMessage[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async insertMessage(
    payload: CreateChatMessageInput
  ): Promise<ServiceResponse<ChatMessage>> {
    try {
      const { data, error } = await supabase.rpc('create_chat_message', {
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

      if (error) {
        return { data: null, error };
      }

      return { data: data as ChatMessage, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async editTextMessage(
    id: string,
    payload: EditChatMessageTextInput
  ): Promise<ServiceResponse<ChatMessage>> {
    try {
      const { data, error } = await supabase.rpc('edit_chat_message_text', {
        p_message_id: id,
        p_message: payload.message,
        p_updated_at: payload.updated_at ?? new Date().toISOString(),
      });

      if (error) {
        return { data: null, error };
      }

      return { data: data as ChatMessage, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async updateFilePreview(
    id: string,
    payload: ChatFilePreviewUpdateInput
  ): Promise<ServiceResponse<ChatMessage>> {
    try {
      const { data, error } = await supabase.rpc(
        'update_chat_file_preview_metadata',
        {
          p_message_id: id,
          p_file_preview_url: payload.file_preview_url ?? null,
          p_file_preview_page_count: payload.file_preview_page_count ?? null,
          p_file_preview_status: payload.file_preview_status ?? null,
          p_file_preview_error: payload.file_preview_error ?? null,
        }
      );

      if (error) {
        return { data: null, error };
      }

      return { data: data as ChatMessage, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async markMessageIdsAsDelivered(
    messageIds: string[]
  ): Promise<ServiceResponse<ChatMessage[]>> {
    if (messageIds.length === 0) return { data: [], error: null };

    try {
      const { data, error } = await supabase.rpc(
        'mark_chat_message_ids_as_delivered',
        {
          p_message_ids: messageIds,
        }
      );

      if (error) {
        return { data: null, error };
      }

      return { data: (data || []) as ChatMessage[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async markMessageIdsAsRead(
    messageIds: string[]
  ): Promise<ServiceResponse<ChatMessage[]>> {
    if (messageIds.length === 0) return { data: [], error: null };

    try {
      const { data, error } = await supabase.rpc(
        'mark_chat_message_ids_as_read',
        {
          p_message_ids: messageIds,
        }
      );

      if (error) {
        return { data: null, error };
      }

      return { data: (data || []) as ChatMessage[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async deleteMessageThreadAndCleanup(
    id: string
  ): Promise<ServiceResponse<DeleteMessageThreadAndCleanupResult>> {
    try {
      const { data, error } =
        await supabase.functions.invoke<DeleteMessageThreadAndCleanupResult>(
          'chat-cleanup',
          {
            body: {
              action: 'delete_thread',
              messageId: id,
            },
          }
        );

      if (error) {
        return { data: null, error: error as PostgrestError };
      }

      return {
        data: {
          deletedMessageIds: Array.isArray(data?.deletedMessageIds)
            ? data.deletedMessageIds.filter(
                deletedMessageId =>
                  typeof deletedMessageId === 'string' &&
                  deletedMessageId.length > 0
              )
            : [],
          failedStoragePaths: Array.isArray(data?.failedStoragePaths)
            ? data.failedStoragePaths.filter(
                failedStoragePath =>
                  typeof failedStoragePath === 'string' &&
                  failedStoragePath.length > 0
              )
            : [],
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async cleanupStoragePaths(
    storagePaths: Array<string | null | undefined>
  ): Promise<ServiceResponse<CleanupStoragePathsResult>> {
    const normalizedStoragePaths = [...new Set(storagePaths)]
      .map(storagePath => storagePath?.trim() || null)
      .filter((storagePath): storagePath is string => Boolean(storagePath));

    if (normalizedStoragePaths.length === 0) {
      return {
        data: {
          failedStoragePaths: [],
        },
        error: null,
      };
    }

    try {
      const { data, error } =
        await supabase.functions.invoke<CleanupStoragePathsResult>(
          'chat-cleanup',
          {
            body: {
              action: 'cleanup_storage',
              storagePaths: normalizedStoragePaths,
            },
          }
        );

      if (error) {
        return { data: null, error: error as PostgrestError };
      }

      return {
        data: {
          failedStoragePaths: Array.isArray(data?.failedStoragePaths)
            ? data.failedStoragePaths.filter(
                failedStoragePath =>
                  typeof failedStoragePath === 'string' &&
                  failedStoragePath.length > 0
              )
            : [],
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async retryChatCleanupFailures(): Promise<
    ServiceResponse<RetryChatCleanupFailuresResult>
  > {
    try {
      const { data, error } =
        await supabase.functions.invoke<RetryChatCleanupFailuresResult>(
          'chat-cleanup',
          {
            body: {
              action: 'retry_failures',
            },
          }
        );

      if (error) {
        return { data: null, error: error as PostgrestError };
      }

      return {
        data: {
          resolvedCount:
            typeof data?.resolvedCount === 'number' ? data.resolvedCount : 0,
          remainingCount:
            typeof data?.remainingCount === 'number' ? data.remainingCount : 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async listUndeliveredIncomingMessageIds(
    receiverId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ServiceResponse<UndeliveredIncomingMessageIdsPage>> {
    try {
      const pageSize = Math.max(1, options?.limit ?? 200);
      const offset = Math.max(0, options?.offset ?? 0);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('receiver_id', receiverId)
        .eq('is_delivered', false)
        .order('created_at', {
          ascending: true,
        })
        .order('id', {
          ascending: true,
        })
        .range(offset, offset + pageSize);

      if (error) {
        return { data: null, error };
      }

      const orderedMessageIds = (data || [])
        .map(record => record.id)
        .filter((messageId): messageId is string => Boolean(messageId));

      return {
        data: {
          messageIds: orderedMessageIds.slice(0, pageSize),
          hasMore: orderedMessageIds.length > pageSize,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async deleteMessageThread(id: string): Promise<ServiceResponse<string[]>> {
    try {
      const { data, error } = await supabase.rpc('delete_chat_message_thread', {
        p_message_id: id,
      });

      if (error) {
        return { data: null, error };
      }

      return {
        data: Array.isArray(data)
          ? data.filter(
              deletedMessageId =>
                typeof deletedMessageId === 'string' &&
                deletedMessageId.length > 0
            )
          : [],
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async getUserPresence(
    userId: string
  ): Promise<ServiceResponse<UserPresence>> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('user_id, is_online, last_seen, updated_at')
        .eq('user_id', userId)
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: data as UserPresence, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async upsertUserPresence(
    userId: string,
    payload: Pick<UserPresenceUpdateInput, 'is_online'>
  ): Promise<ServiceResponse<UserPresence>> {
    try {
      const { data, error } = await supabase.rpc('upsert_user_presence', {
        p_user_id: userId,
        p_is_online:
          typeof payload.is_online === 'boolean' ? payload.is_online : null,
        p_last_chat_opened: null,
      });

      if (error) {
        return { data: null, error };
      }

      return { data: data as UserPresence, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async syncUserPresenceOnlineState(userId: string, isOnline: boolean) {
    try {
      const { error } = await chatService.upsertUserPresence(userId, {
        is_online: isOnline,
      });

      if (error) {
        console.error('Failed to sync user presence state:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Caught error syncing user presence state:', error);
      return false;
    }
  },

  async listActivePresenceSince(
    since: string
  ): Promise<ServiceResponse<UserPresence[]>> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('user_id, is_online, last_seen, updated_at')
        .eq('is_online', true)
        .gte('last_seen', since);

      if (error) {
        return { data: null, error };
      }

      return { data: (data || []) as UserPresence[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  sendUserPresenceUpdateKeepalive(
    userId: string,
    payload: UserPresenceUpdateInput,
    accessToken?: string | null
  ) {
    if (
      typeof window === 'undefined' ||
      typeof fetch !== 'function' ||
      !userId ||
      !accessToken
    ) {
      return false;
    }

    try {
      void fetch(buildUserPresenceRestUrl(userId), {
        method: 'PATCH',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(error => {
        console.error(
          'Keepalive presence update failed while closing chat:',
          error
        );
      });

      return true;
    } catch (error) {
      console.error('Error starting keepalive presence update:', error);
      return false;
    }
  },

  syncUserPresenceOnPageExit(
    userId: string,
    accessToken?: string | null,
    timestamp = new Date().toISOString()
  ) {
    const exitPayload: UserPresenceUpdateInput = {
      is_online: false,
      last_seen: timestamp,
      updated_at: timestamp,
    };

    const keepaliveStarted = chatService.sendUserPresenceUpdateKeepalive(
      userId,
      exitPayload,
      accessToken
    );

    void updateUserPresenceRow(userId, exitPayload)
      .then(({ error }) => {
        if (error) {
          console.error(
            'Fallback presence update failed while closing chat:',
            error
          );
        }
      })
      .catch(error => {
        console.error(
          'Fallback presence update crashed while closing chat:',
          error
        );
      });

    return keepaliveStarted;
  },
};
