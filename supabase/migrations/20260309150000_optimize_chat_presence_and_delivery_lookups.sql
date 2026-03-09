begin;

create index if not exists idx_user_presence_active_last_seen
  on public.user_presence (last_seen desc)
  where is_online = true;

create index if not exists idx_chat_messages_undelivered_receiver_created_at
  on public.chat_messages (receiver_id, created_at)
  where is_delivered = false;

commit;
