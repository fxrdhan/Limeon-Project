begin;

alter table public.chat_messages
  add column if not exists file_name text,
  add column if not exists file_kind character varying(16),
  add column if not exists file_mime_type text,
  add column if not exists file_size bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_file_kind_check'
  ) then
    alter table public.chat_messages
      add constraint chat_messages_file_kind_check
      check (file_kind is null or file_kind in ('audio', 'document'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_file_size_nonnegative_check'
  ) then
    alter table public.chat_messages
      add constraint chat_messages_file_size_nonnegative_check
      check (file_size is null or file_size >= 0);
  end if;
end $$;

update public.chat_messages cm
set file_name = coalesce(
  cm.file_name,
  nullif(regexp_replace(split_part(cm.message, '?', 1), '^.*/', ''), '')
)
where cm.message_type = 'file';

update public.chat_messages cm
set file_kind = coalesce(
  cm.file_kind,
  case
    when lower(coalesce(cm.file_mime_type, '')) like 'audio/%'
      or lower(cm.message) ~ '\.(mp3|wav|ogg|m4a|aac|flac)(\?|$)'
    then 'audio'
    else 'document'
  end
)
where cm.message_type = 'file';

update public.chat_messages cm
set
  file_size = coalesce(
    cm.file_size,
    nullif(so.metadata ->> 'size', '')::bigint,
    nullif(so.metadata ->> 'contentLength', '')::bigint
  ),
  file_mime_type = coalesce(
    cm.file_mime_type,
    nullif(so.metadata ->> 'mimetype', '')
  )
from storage.objects so
where cm.message_type = 'file'
  and cm.message like '%/storage/v1/object/public/chat/%'
  and so.bucket_id = 'chat'
  and so.name = split_part(
    split_part(cm.message, '/storage/v1/object/public/chat/', 2),
    '?',
    1
  );

alter table public.chat_messages
  add column if not exists file_storage_path text,
  add column if not exists file_preview_url text,
  add column if not exists file_preview_page_count integer,
  add column if not exists file_preview_status character varying(16),
  add column if not exists file_preview_error text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_file_preview_status_check'
  ) then
    alter table public.chat_messages
      add constraint chat_messages_file_preview_status_check
      check (
        file_preview_status is null
        or file_preview_status in ('pending', 'ready', 'failed')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_file_preview_page_count_check'
  ) then
    alter table public.chat_messages
      add constraint chat_messages_file_preview_page_count_check
      check (file_preview_page_count is null or file_preview_page_count > 0);
  end if;
end $$;

update public.chat_messages cm
set file_storage_path = coalesce(
  cm.file_storage_path,
  case
    when cm.message like '%/storage/v1/object/public/chat/%' then split_part(
      split_part(cm.message, '/storage/v1/object/public/chat/', 2),
      '?',
      1
    )
    when cm.message like '%/storage/v1/object/sign/chat/%' then split_part(
      split_part(cm.message, '/storage/v1/object/sign/chat/', 2),
      '?',
      1
    )
    when cm.message like '%/storage/v1/object/authenticated/chat/%' then split_part(
      split_part(cm.message, '/storage/v1/object/authenticated/chat/', 2),
      '?',
      1
    )
    else null
  end
)
where cm.message_type = 'file';

update public.chat_messages cm
set file_preview_status = case
  when coalesce(trim(cm.file_preview_url), '') <> '' then 'ready'
  when cm.file_preview_status is null then 'pending'
  else cm.file_preview_status
end
where cm.message_type = 'file'
  and (
    lower(coalesce(cm.file_mime_type, '')) = 'application/pdf'
    or lower(coalesce(cm.file_name, '')) like '%.pdf'
    or lower(coalesce(cm.message, '')) ~ '\\.pdf(\\?|$)'
  );

create index if not exists idx_chat_messages_file_preview_status
  on public.chat_messages (file_preview_status)
  where message_type = 'file';

commit;
