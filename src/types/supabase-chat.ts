// Generated from the Supabase chat schema and kept as the TS source of truth
// for the chat sidebar data contract.

export interface ChatMessageRow {
  channel_id: string | null;
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
  receiver_id: string | null;
  reply_to_id: string | null;
  sender_id: string;
  updated_at: string | null;
}

export interface ChatMessageInsertRow {
  channel_id?: string | null;
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
  receiver_id?: string | null;
  reply_to_id?: string | null;
  sender_id: string;
  updated_at?: string | null;
}

export interface ChatMessageUpdateRow {
  channel_id?: string | null;
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
  receiver_id?: string | null;
  reply_to_id?: string | null;
  sender_id?: string;
  updated_at?: string | null;
}

export interface UserPresenceRow {
  id: string;
  is_online: boolean | null;
  last_chat_opened: string | null;
  last_seen: string | null;
  updated_at: string | null;
  user_id: string;
}

export interface UserPresenceInsertRow {
  id?: string;
  is_online?: boolean | null;
  last_chat_opened?: string | null;
  last_seen?: string | null;
  updated_at?: string | null;
  user_id: string;
}

export interface UserPresenceUpdateRow {
  id?: string;
  is_online?: boolean | null;
  last_chat_opened?: string | null;
  last_seen?: string | null;
  updated_at?: string | null;
  user_id?: string;
}
