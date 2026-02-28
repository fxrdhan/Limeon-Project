import { supabase } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { ServiceResponse } from './base.service';

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  channel_id: string | null;
  message: string;
  message_type: 'text' | 'image' | 'file';
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

export const chatService = {
  async fetchMessagesBetweenUsers(
    userId: string,
    targetUserId: string
  ): Promise<ServiceResponse<ChatMessage[]>> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${targetUserId}),and(sender_id.eq.${targetUserId},receiver_id.eq.${userId})`
        )
        .order('created_at', { ascending: true });

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
};
