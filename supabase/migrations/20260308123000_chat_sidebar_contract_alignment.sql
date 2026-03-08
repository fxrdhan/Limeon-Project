begin;

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

update public.chat_messages
set file_storage_path = regexp_replace(
  message,
  '^.*?/storage/v1/object/public/chat/',
  ''
)
where message_type in ('image', 'file')
  and coalesce(file_storage_path, '') = ''
  and message like '%/storage/v1/object/public/chat/%';

update public.chat_messages
set message = file_storage_path
where message_type in ('image', 'file')
  and coalesce(file_storage_path, '') <> ''
  and message is distinct from file_storage_path;

update public.chat_messages
set file_preview_url = regexp_replace(
  file_preview_url,
  '^.*?/storage/v1/object/public/chat/',
  ''
)
where coalesce(file_preview_url, '') <> ''
  and file_preview_url like '%/storage/v1/object/public/chat/%';

update storage.buckets
set public = false
where id = 'chat';

drop policy if exists "Enable read access for all users" on storage.objects;

drop policy if exists "Authenticated users can manage non-chat storage objects"
on storage.objects;
create policy "Authenticated users can manage non-chat storage objects"
  on storage.objects
  for all
  to authenticated
  using (bucket_id <> 'chat')
  with check (bucket_id <> 'chat');

drop policy if exists "Chat participants can read chat objects" on storage.objects;
create policy "Chat participants can read chat objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'chat'
    and (
      split_part(name, '/', 3) like auth.uid()::text || '\_%' escape '\'
      or exists (
        select 1
        from public.chat_messages chat_message
        where (chat_message.sender_id = auth.uid() or chat_message.receiver_id = auth.uid())
          and (
            chat_message.file_storage_path = storage.objects.name
            or chat_message.file_preview_url = storage.objects.name
          )
      )
    )
  );

drop policy if exists "Chat senders can insert chat objects" on storage.objects;
create policy "Chat senders can insert chat objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'chat'
    and split_part(name, '/', 3) like auth.uid()::text || '\_%' escape '\'
  );

drop policy if exists "Chat senders can update chat objects" on storage.objects;
create policy "Chat senders can update chat objects"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'chat'
    and split_part(name, '/', 3) like auth.uid()::text || '\_%' escape '\'
  )
  with check (
    bucket_id = 'chat'
    and split_part(name, '/', 3) like auth.uid()::text || '\_%' escape '\'
  );

drop policy if exists "Chat senders can delete chat objects" on storage.objects;
create policy "Chat senders can delete chat objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'chat'
    and split_part(name, '/', 3) like auth.uid()::text || '\_%' escape '\'
  );

alter table public.user_presence
  drop column if exists current_chat_channel;

commit;
