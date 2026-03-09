begin;

create or replace function public.compute_dm_channel_id(
  p_user_a uuid,
  p_user_b uuid
) returns text
language sql
immutable
strict
as $function$
  select 'dm_'
    || least(p_user_a::text, p_user_b::text)
    || '_'
    || greatest(p_user_a::text, p_user_b::text);
$function$;

alter table public.chat_messages
  alter column receiver_id set not null,
  alter column channel_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_channel_matches_dm_check'
  ) then
    alter table public.chat_messages
      add constraint chat_messages_channel_matches_dm_check
      check (
        channel_id = public.compute_dm_channel_id(sender_id, receiver_id)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_text_message_nonempty_check'
  ) then
    alter table public.chat_messages
      add constraint chat_messages_text_message_nonempty_check
      check (
        message_type <> 'text'
        or length(btrim(message)) > 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_attachment_storage_path_check'
  ) then
    alter table public.chat_messages
      add constraint chat_messages_attachment_storage_path_check
      check (
        message_type not in ('image', 'file')
        or length(btrim(coalesce(file_storage_path, ''))) > 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_attachment_message_matches_storage_path_check'
  ) then
    alter table public.chat_messages
      add constraint chat_messages_attachment_message_matches_storage_path_check
      check (
        message_type not in ('image', 'file')
        or message = file_storage_path
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_messages_attachment_caption_shape_check'
  ) then
    alter table public.chat_messages
      add constraint chat_messages_attachment_caption_shape_check
      check (
        message_relation_kind is distinct from 'attachment_caption'
        or (
          message_type = 'text'
          and reply_to_id is not null
        )
      );
  end if;
end
$$;

create or replace function public.validate_chat_message_relations()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  parent_message public.chat_messages;
begin
  if new.reply_to_id is null then
    if new.message_relation_kind = 'attachment_caption' then
      raise exception 'Attachment caption requires reply_to_id';
    end if;

    return new;
  end if;

  select *
  into parent_message
  from public.chat_messages
  where id = new.reply_to_id;

  if parent_message.id is null then
    raise exception 'reply_to_id does not reference an existing chat message';
  end if;

  if parent_message.sender_id is distinct from new.sender_id
    or parent_message.receiver_id is distinct from new.receiver_id
    or parent_message.channel_id is distinct from new.channel_id then
    raise exception 'Reply target must belong to the same conversation';
  end if;

  if new.message_relation_kind = 'attachment_caption'
    and parent_message.message_type not in ('image', 'file') then
    raise exception 'Attachment caption must reference an attachment message';
  end if;

  return new;
end;
$function$;

drop trigger if exists validate_chat_message_relations on public.chat_messages;

create trigger validate_chat_message_relations
before insert or update of
  reply_to_id,
  message_relation_kind,
  sender_id,
  receiver_id,
  channel_id,
  message_type
on public.chat_messages
for each row
execute function public.validate_chat_message_relations();

create or replace function public.fetch_chat_messages_page(
  p_target_user_id uuid,
  p_channel_id text default null,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 51
) returns setof public.chat_messages
language plpgsql
security definer
set search_path = public
as $function$
declare
  requester_id uuid := auth.uid();
  expected_channel_id text;
  normalized_limit integer := greatest(1, least(coalesce(p_limit, 51), 201));
begin
  if requester_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_user_id is null then
    raise exception 'Target user is required';
  end if;

  if (p_before_created_at is null) <> (p_before_id is null) then
    raise exception 'Pagination cursor must include both created_at and id';
  end if;

  expected_channel_id := public.compute_dm_channel_id(
    requester_id,
    p_target_user_id
  );

  if coalesce(p_channel_id, expected_channel_id) <> expected_channel_id then
    raise exception 'Invalid channel_id';
  end if;

  return query
  select cm.*
  from public.chat_messages cm
  where (
      (cm.sender_id = requester_id and cm.receiver_id = p_target_user_id)
      or (cm.sender_id = p_target_user_id and cm.receiver_id = requester_id)
    )
    and cm.channel_id = expected_channel_id
    and (
      p_before_created_at is null
      or p_before_id is null
      or (cm.created_at, cm.id) < (p_before_created_at, p_before_id)
    )
  order by cm.created_at desc, cm.id desc
  limit normalized_limit;
end;
$function$;

revoke all on function public.fetch_chat_messages_page(uuid, text, timestamptz, uuid, integer) from public;
revoke all on function public.fetch_chat_messages_page(uuid, text, timestamptz, uuid, integer) from anon;
revoke all on function public.fetch_chat_messages_page(uuid, text, timestamptz, uuid, integer) from authenticated;
grant execute on function public.fetch_chat_messages_page(uuid, text, timestamptz, uuid, integer) to authenticated;
grant execute on function public.fetch_chat_messages_page(uuid, text, timestamptz, uuid, integer) to service_role;

create index if not exists idx_chat_messages_channel_created_at_id
  on public.chat_messages (channel_id, created_at desc, id desc);

commit;
