begin;

alter table public.chat_messages
  add column if not exists file_storage_path text,
  add column if not exists file_preview_url text;

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

commit;
