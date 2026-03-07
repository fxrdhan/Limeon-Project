alter table public.chat_messages
  add column if not exists message_relation_kind text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_message_relation_kind_check'
  ) then
    alter table public.chat_messages
      add constraint chat_messages_message_relation_kind_check
      check (
        message_relation_kind is null
        or message_relation_kind = 'attachment_caption'
      );
  end if;
end
$$;

update public.chat_messages caption_message
set message_relation_kind = 'attachment_caption'
from public.chat_messages parent_message
where caption_message.message_relation_kind is distinct from 'attachment_caption'
  and caption_message.message_type = 'text'
  and caption_message.reply_to_id = parent_message.id
  and parent_message.message_type in ('image', 'file')
  and caption_message.sender_id = parent_message.sender_id
  and caption_message.receiver_id is not distinct from parent_message.receiver_id
  and caption_message.channel_id is not distinct from parent_message.channel_id;

create or replace function public.delete_chat_message_thread(
  p_message_id uuid
) returns uuid[]
language sql
set search_path = public
as $$
  with parent_message as (
    select id, sender_id, receiver_id, channel_id
    from public.chat_messages
    where id = p_message_id
      and sender_id = auth.uid()
  ),
  deleted_messages as (
    delete from public.chat_messages
    where id in (
      select parent_message.id
      from parent_message
      union
      select linked_message.id
      from public.chat_messages linked_message
      join parent_message
        on linked_message.reply_to_id = parent_message.id
       and linked_message.message_relation_kind = 'attachment_caption'
       and linked_message.message_type = 'text'
       and linked_message.sender_id = parent_message.sender_id
       and linked_message.receiver_id is not distinct from parent_message.receiver_id
       and linked_message.channel_id is not distinct from parent_message.channel_id
    )
    returning id
  )
  select coalesce(array_agg(id), '{}'::uuid[])
  from deleted_messages;
$$;

revoke all on function public.delete_chat_message_thread(uuid) from public;
grant execute on function public.delete_chat_message_thread(uuid) to authenticated;
grant execute on function public.delete_chat_message_thread(uuid) to service_role;
