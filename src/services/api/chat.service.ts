import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from './base.service';
import type {
  ChatMessageInsertRow,
  ChatMessageRow,
  ChatMessageUpdateRow,
  UserPresenceInsertRow,
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

export type ChatMessageUpdateInput = Omit<
  ChatMessageUpdateRow,
  'message_relation_kind' | 'message_type' | 'file_kind'
> & {
  message_relation_kind?: 'attachment_caption' | null;
  message_type?: 'text' | 'image' | 'file';
  file_kind?: 'audio' | 'document';
};

export type UserPresenceUpdateInput = Omit<
  UserPresenceUpdateRow,
  'is_online' | 'last_seen'
> & {
  is_online?: boolean;
  last_seen?: string;
};

export type UserPresenceInsertInput = Omit<
  UserPresenceInsertRow,
  'is_online' | 'last_seen'
> & {
  is_online?: boolean;
  last_seen?: string;
};

export interface ConversationMessagesPage {
  messages: ChatMessage[];
  hasMore: boolean;
}

const buildUserPresenceRestUrl = (userId: string) => {
  const requestUrl = new URL(`${supabaseUrl}/rest/v1/user_presence`);
  requestUrl.searchParams.set('user_id', `eq.${userId}`);
  return requestUrl.toString();
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
    userId: string,
    targetUserId: string,
    channelId?: string | null,
    options?: {
      beforeCreatedAt?: string | null;
      limit?: number;
    }
  ): Promise<ServiceResponse<ConversationMessagesPage>> {
    try {
      const pageSize = Math.max(
        1,
        options?.limit ?? DEFAULT_CHAT_MESSAGES_PAGE_SIZE
      );
      let query = supabase
        .from('chat_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${userId})`
        );

      if (channelId) {
        query = query.eq('channel_id', channelId);
      }

      if (options?.beforeCreatedAt) {
        query = query.lt('created_at', options.beforeCreatedAt);
      }

      const { data, error } = await query
        .order('created_at', {
          ascending: false,
        })
        .limit(pageSize + 1);

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

  async insertMessage(
    payload: ChatMessageInsertInput
  ): Promise<ServiceResponse<ChatMessage>> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(payload)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: data as ChatMessage, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async updateMessage(
    id: string,
    payload: ChatMessageUpdateInput
  ): Promise<ServiceResponse<ChatMessage>> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: data as ChatMessage, error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async markMessagesAsRead(
    senderId: string,
    receiverId: string,
    channelId?: string | null
  ): Promise<ServiceResponse<ChatMessage[]>> {
    try {
      const { data, error } = await supabase.rpc('mark_chat_messages_as_read', {
        p_sender_id: senderId,
        p_receiver_id: receiverId,
        p_channel_id: channelId ?? null,
      });

      if (error) {
        return { data: null, error };
      }

      return { data: (data || []) as ChatMessage[], error: null };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async markMessagesAsDelivered(
    senderId: string,
    receiverId: string,
    channelId?: string | null
  ): Promise<ServiceResponse<ChatMessage[]>> {
    try {
      const { data, error } = await supabase.rpc(
        'mark_chat_messages_as_delivered',
        {
          p_sender_id: senderId,
          p_receiver_id: receiverId,
          p_channel_id: channelId ?? null,
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
    receiverId: string
  ): Promise<ServiceResponse<string[]>> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('receiver_id', receiverId)
        .eq('is_delivered', false)
        .order('created_at', {
          ascending: true,
        });

      if (error) {
        return { data: null, error };
      }

      return {
        data: (data || [])
          .map(record => record.id)
          .filter((messageId): messageId is string => Boolean(messageId)),
        error: null,
      };
    } catch (error) {
      return { data: null, error: error as PostgrestError };
    }
  },

  async deleteMessage(id: string): Promise<ServiceResponse<null>> {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', id);

      return { data: null, error };
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

  async updateUserPresence(
    userId: string,
    payload: UserPresenceUpdateInput
  ): Promise<ServiceResponse<UserPresence[]>> {
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
  },

  async insertUserPresence(
    payload: UserPresenceInsertInput
  ): Promise<ServiceResponse<UserPresence[]>> {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .insert(payload)
        .select();

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
};
