import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from '../base.service';
import {
  DEFAULT_CHAT_MESSAGES_PAGE_SIZE,
  type ChatMessage,
  type ChatFilePreviewUpdateInput,
  type ConversationMessagesPage,
  type ConversationSearchContextOptions,
  type CreateChatMessageInput,
  type EditChatMessageTextInput,
  type UndeliveredIncomingMessageIdsPage,
} from './types';

export const chatMessagesService = {
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
      const { data, error, count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact' })
        .eq('receiver_id', receiverId)
        .eq('is_delivered', false)
        .order('created_at', {
          ascending: true,
        })
        .order('id', {
          ascending: true,
        })
        .range(offset, offset + pageSize - 1);

      if (error) {
        return { data: null, error };
      }

      const orderedMessageIds = (data || [])
        .map(record => record.id)
        .filter((messageId): messageId is string => Boolean(messageId));

      return {
        data: {
          messageIds: orderedMessageIds,
          hasMore:
            typeof count === 'number'
              ? offset + orderedMessageIds.length < count
              : orderedMessageIds.length === pageSize,
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
};
