begin;

create extension if not exists pg_trgm with schema extensions;

create index if not exists idx_chat_messages_search_text_message_trgm
  on public.chat_messages
  using gin (message gin_trgm_ops)
  where message_type = 'text'
    and message_relation_kind is distinct from 'attachment_caption';

create index if not exists idx_chat_messages_search_attachment_file_name_trgm
  on public.chat_messages
  using gin ((coalesce(file_name, '')) gin_trgm_ops)
  where message_type in ('image', 'file');

create index if not exists idx_chat_messages_search_attachment_caption_message_trgm
  on public.chat_messages
  using gin (message gin_trgm_ops)
  where message_relation_kind = 'attachment_caption';

create index if not exists idx_chat_messages_attachment_caption_reply_to_id
  on public.chat_messages (reply_to_id)
  where message_relation_kind = 'attachment_caption';

commit;
