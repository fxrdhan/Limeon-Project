begin;

create or replace function public.delete_chat_message_thread(
  p_message_id uuid
) returns uuid[]
language sql
security definer
set search_path = public
as $$
  with parent_message as (
    select id, sender_id, receiver_id, channel_id
    from public.chat_messages
    where id = p_message_id
      and (
        sender_id = auth.uid()
        or receiver_id = auth.uid()
      )
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
revoke all on function public.delete_chat_message_thread(uuid) from anon;
revoke all on function public.delete_chat_message_thread(uuid) from authenticated;
grant execute on function public.delete_chat_message_thread(uuid) to authenticated;
grant execute on function public.delete_chat_message_thread(uuid) to service_role;

commit;
