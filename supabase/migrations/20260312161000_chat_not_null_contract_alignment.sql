begin;

update public.chat_messages
set
  created_at = coalesce(created_at, updated_at, now()),
  updated_at = coalesce(updated_at, created_at, now()),
  is_read = coalesce(is_read, false),
  message_type = coalesce(nullif(btrim(message_type), ''), 'text')
where created_at is null
   or updated_at is null
   or is_read is null
   or message_type is null
   or btrim(message_type) = '';

alter table public.chat_messages
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  alter column is_read set default false,
  alter column is_read set not null,
  alter column message_type set default 'text',
  alter column message_type set not null;

update public.user_presence
set
  is_online = coalesce(is_online, false),
  last_seen = coalesce(last_seen, updated_at, now())
where is_online is null
   or last_seen is null;

alter table public.user_presence
  alter column is_online set default false,
  alter column is_online set not null,
  alter column last_seen set default now(),
  alter column last_seen set not null;

commit;
