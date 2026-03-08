import { supabase, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from './base.service';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  channel_id: string | null;
  message: string;
  message_type: 'text' | 'image' | 'file';
  message_relation_kind?: 'attachment_caption' | null;
  file_name?: string;
  file_kind?: 'audio' | 'document';
  file_mime_type?: string;
  file_size?: number;
  file_storage_path?: string;
  file_preview_url?: string | null;
  file_preview_page_count?: number | null;
  file_preview_status?: 'pending' | 'ready' | 'failed' | null;
  file_preview_error?: string | null;
  created_at: string;
  updated_at: string;
  is_read: boolean;
  is_delivered?: boolean;
  reply_to_id: string | null;
  // Virtual fields for display
  sender_name?: string;
  receiver_name?: string;
  // Stable key for consistent animation during optimistic updates
  stableKey?: string;
}

export interface UserPresence {
  user_id: string;
  is_online: boolean;
  last_seen: string;
  current_chat_channel: string | null;
}

export interface ChatMessageInsertInput {
  sender_id: string;
  receiver_id: string;
  channel_id: string | null;
  message: string;
  message_type: 'text' | 'image' | 'file';
  message_relation_kind?: 'attachment_caption' | null;
  file_name?: string;
  file_kind?: 'audio' | 'document';
  file_mime_type?: string;
  file_size?: number;
  file_storage_path?: string;
  file_preview_url?: string | null;
  file_preview_page_count?: number | null;
  file_preview_status?: 'pending' | 'ready' | 'failed' | null;
  file_preview_error?: string | null;
  reply_to_id?: string | null;
}

export interface ChatMessageUpdateInput {
  message?: string;
  updated_at?: string;
  is_read?: boolean;
  is_delivered?: boolean;
  reply_to_id?: string | null;
  message_relation_kind?: 'attachment_caption' | null;
  file_preview_url?: string | null;
  file_preview_page_count?: number | null;
  file_preview_status?: 'pending' | 'ready' | 'failed' | null;
  file_preview_error?: string | null;
}

export interface UserPresenceUpdateInput {
  is_online?: boolean;
  current_chat_channel?: string | null;
  last_seen?: string;
  updated_at?: string;
}

export interface UserPresenceInsertInput extends UserPresenceUpdateInput {
  user_id: string;
}

let chatMessagesSupportsRelationKind: boolean | null = null;

const buildUserPresenceRestUrl = (userId: string) => {
  const requestUrl = new URL(`${supabaseUrl}/rest/v1/user_presence`);
  requestUrl.searchParams.set('user_id', `eq.${userId}`);
  return requestUrl.toString();
};

const hasOwnMessageRelationKind = (
  payload: ChatMessageInsertInput | ChatMessageUpdateInput
) => Object.prototype.hasOwnProperty.call(payload, 'message_relation_kind');

const stripMessageRelationKind = <
  T extends ChatMessageInsertInput | ChatMessageUpdateInput,
>(
  payload: T
) => {
  const {
    message_relation_kind: _messageRelationKind,
    ...payloadWithoutRelationKind
  } = payload;
  return payloadWithoutRelationKind;
};

const isMissingMessageRelationKindError = (error: PostgrestError | null) => {
  if (!error) return false;

  return [error.message, error.details, error.hint].some(candidate =>
    candidate?.includes('message_relation_kind')
  );
};

export const chatService = {
  async fetchMessagesBetweenUsers(
    userId: string,
    targetUserId: string,
    channelId?: string | null
  ): Promise<ServiceResponse<ChatMessage[]>> {
    try {
      let query = supabase
        .from('chat_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${userId})`
        );

      if (channelId) {
        query = query.eq('channel_id', channelId);
      }

      const { data, error } = await query.order('created_at', {
        ascending: true,
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
    payload: ChatMessageInsertInput
  ): Promise<ServiceResponse<ChatMessage>> {
    try {
      const insertPayload =
        chatMessagesSupportsRelationKind === false
          ? stripMessageRelationKind(payload)
          : payload;
      let { data, error } = await supabase
        .from('chat_messages')
        .insert(insertPayload)
        .select()
        .single();

      if (
        error &&
        hasOwnMessageRelationKind(payload) &&
        isMissingMessageRelationKindError(error)
      ) {
        chatMessagesSupportsRelationKind = false;
        ({ data, error } = await supabase
          .from('chat_messages')
          .insert(stripMessageRelationKind(payload))
          .select()
          .single());
      } else if (!error && hasOwnMessageRelationKind(payload)) {
        chatMessagesSupportsRelationKind = true;
      }

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
      const updatePayload =
        chatMessagesSupportsRelationKind === false
          ? stripMessageRelationKind(payload)
          : payload;
      let { data, error } = await supabase
        .from('chat_messages')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (
        error &&
        hasOwnMessageRelationKind(payload) &&
        isMissingMessageRelationKindError(error)
      ) {
        chatMessagesSupportsRelationKind = false;
        ({ data, error } = await supabase
          .from('chat_messages')
          .update(stripMessageRelationKind(payload))
          .eq('id', id)
          .select()
          .single());
      } else if (!error && hasOwnMessageRelationKind(payload)) {
        chatMessagesSupportsRelationKind = true;
      }

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
        .select('user_id, is_online, last_seen, current_chat_channel')
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
