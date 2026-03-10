// Generated from the Supabase chat schema on 2026-03-10.
// Refresh this file from Supabase whenever the chat contract changes.

export interface ChatDatabase {
  public: {
    Tables: {
      chat_messages: {
        Row: {
          channel_id: string;
          created_at: string | null;
          file_kind: string | null;
          file_mime_type: string | null;
          file_name: string | null;
          file_preview_error: string | null;
          file_preview_page_count: number | null;
          file_preview_status: string | null;
          file_preview_url: string | null;
          file_size: number | null;
          file_storage_path: string | null;
          id: string;
          is_delivered: boolean;
          is_read: boolean | null;
          message: string;
          message_relation_kind: string | null;
          message_type: string | null;
          receiver_id: string;
          reply_to_id: string | null;
          sender_id: string;
          updated_at: string | null;
        };
        Insert: {
          channel_id: string;
          created_at?: string | null;
          file_kind?: string | null;
          file_mime_type?: string | null;
          file_name?: string | null;
          file_preview_error?: string | null;
          file_preview_page_count?: number | null;
          file_preview_status?: string | null;
          file_preview_url?: string | null;
          file_size?: number | null;
          file_storage_path?: string | null;
          id?: string;
          is_delivered?: boolean;
          is_read?: boolean | null;
          message: string;
          message_relation_kind?: string | null;
          message_type?: string | null;
          receiver_id: string;
          reply_to_id?: string | null;
          sender_id: string;
          updated_at?: string | null;
        };
        Update: {
          channel_id?: string;
          created_at?: string | null;
          file_kind?: string | null;
          file_mime_type?: string | null;
          file_name?: string | null;
          file_preview_error?: string | null;
          file_preview_page_count?: number | null;
          file_preview_status?: string | null;
          file_preview_url?: string | null;
          file_size?: number | null;
          file_storage_path?: string | null;
          id?: string;
          is_delivered?: boolean;
          is_read?: boolean | null;
          message?: string;
          message_relation_kind?: string | null;
          message_type?: string | null;
          receiver_id?: string;
          reply_to_id?: string | null;
          sender_id?: string;
          updated_at?: string | null;
        };
      };
      chat_storage_cleanup_failures: {
        Row: {
          attempts: number;
          created_at: string;
          failure_stage: string;
          id: string;
          last_error: string | null;
          message_id: string | null;
          requested_by: string;
          resolved_at: string | null;
          storage_paths: string[];
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          created_at?: string;
          failure_stage: string;
          id?: string;
          last_error?: string | null;
          message_id?: string | null;
          requested_by: string;
          resolved_at?: string | null;
          storage_paths?: string[];
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          created_at?: string;
          failure_stage?: string;
          id?: string;
          last_error?: string | null;
          message_id?: string | null;
          requested_by?: string;
          resolved_at?: string | null;
          storage_paths?: string[];
          updated_at?: string;
        };
      };
      user_presence: {
        Row: {
          id: string;
          is_online: boolean | null;
          last_chat_opened: string | null;
          last_seen: string | null;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          is_online?: boolean | null;
          last_chat_opened?: string | null;
          last_seen?: string | null;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          is_online?: boolean | null;
          last_chat_opened?: string | null;
          last_seen?: string | null;
          updated_at?: string | null;
          user_id?: string;
        };
      };
    };
    Functions: {
      compute_dm_channel_id: {
        Args: { p_user_a: string; p_user_b: string };
        Returns: string;
      };
      create_chat_message: {
        Args: {
          p_file_kind?: string | null;
          p_file_mime_type?: string | null;
          p_file_name?: string | null;
          p_file_size?: number | null;
          p_file_storage_path?: string | null;
          p_message: string;
          p_message_relation_kind?: string | null;
          p_message_type?: string | null;
          p_receiver_id: string;
          p_reply_to_id?: string | null;
        };
        Returns: ChatDatabase['public']['Tables']['chat_messages']['Row'];
      };
      delete_chat_message_thread: {
        Args: { p_message_id: string };
        Returns: string[];
      };
      edit_chat_message_text: {
        Args: {
          p_message: string;
          p_message_id: string;
          p_updated_at?: string | null;
        };
        Returns: ChatDatabase['public']['Tables']['chat_messages']['Row'];
      };
      fetch_chat_message_context: {
        Args: {
          p_after_limit?: number | null;
          p_before_limit?: number | null;
          p_channel_id?: string | null;
          p_message_id?: string | null;
          p_target_user_id: string;
        };
        Returns: ChatDatabase['public']['Tables']['chat_messages']['Row'][];
      };
      fetch_chat_messages_page: {
        Args: {
          p_before_created_at?: string | null;
          p_before_id?: string | null;
          p_channel_id?: string | null;
          p_limit?: number | null;
          p_target_user_id: string;
        };
        Returns: ChatDatabase['public']['Tables']['chat_messages']['Row'][];
      };
      mark_chat_message_ids_as_delivered: {
        Args: { p_message_ids: string[] };
        Returns: ChatDatabase['public']['Tables']['chat_messages']['Row'][];
      };
      mark_chat_message_ids_as_read: {
        Args: { p_message_ids: string[] };
        Returns: ChatDatabase['public']['Tables']['chat_messages']['Row'][];
      };
      search_chat_messages: {
        Args: {
          p_channel_id?: string | null;
          p_limit?: number | null;
          p_query?: string | null;
          p_target_user_id: string;
        };
        Returns: ChatDatabase['public']['Tables']['chat_messages']['Row'][];
      };
      sync_user_presence_on_exit: {
        Args: {
          p_is_online?: boolean | null;
          p_last_seen?: string | null;
          p_user_id: string;
        };
        Returns: ChatDatabase['public']['Tables']['user_presence']['Row'];
      };
      update_chat_file_preview_metadata: {
        Args: {
          p_file_preview_error?: string | null;
          p_file_preview_page_count?: number | null;
          p_file_preview_status?: string | null;
          p_file_preview_url?: string | null;
          p_message_id: string;
        };
        Returns: ChatDatabase['public']['Tables']['chat_messages']['Row'];
      };
      upsert_user_presence: {
        Args: {
          p_is_online?: boolean | null;
          p_last_chat_opened?: string | null;
          p_user_id: string;
        };
        Returns: ChatDatabase['public']['Tables']['user_presence']['Row'];
      };
    };
  };
}

export type ChatTableName = keyof ChatDatabase['public']['Tables'];

export type ChatTableRow<TableName extends ChatTableName> =
  ChatDatabase['public']['Tables'][TableName]['Row'];

export type ChatTableInsert<TableName extends ChatTableName> =
  ChatDatabase['public']['Tables'][TableName]['Insert'];

export type ChatTableUpdate<TableName extends ChatTableName> =
  ChatDatabase['public']['Tables'][TableName]['Update'];

export type ChatFunctionName = keyof ChatDatabase['public']['Functions'];

export type ChatFunctionArgs<FunctionName extends ChatFunctionName> =
  ChatDatabase['public']['Functions'][FunctionName]['Args'];

export type ChatFunctionReturn<FunctionName extends ChatFunctionName> =
  ChatDatabase['public']['Functions'][FunctionName]['Returns'];
