begin;

create or replace function public.compute_dm_channel_id(
  p_user_a uuid,
  p_user_b uuid
) returns text
language sql
immutable
strict
set search_path = public
as $function$
  select 'dm_'
    || least(p_user_a::text, p_user_b::text)
    || '_'
    || greatest(p_user_a::text, p_user_b::text);
$function$;

create or replace function public.update_chat_messages_updated_at()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if
    (
      new.is_read is distinct from old.is_read
      or new.is_delivered is distinct from old.is_delivered
    )
    and new.sender_id is not distinct from old.sender_id
    and new.receiver_id is not distinct from old.receiver_id
    and new.channel_id is not distinct from old.channel_id
    and new.message is not distinct from old.message
    and new.message_type is not distinct from old.message_type
    and new.reply_to_id is not distinct from old.reply_to_id
    and new.file_name is not distinct from old.file_name
    and new.file_kind is not distinct from old.file_kind
    and new.file_mime_type is not distinct from old.file_mime_type
    and new.file_size is not distinct from old.file_size
    and new.file_storage_path is not distinct from old.file_storage_path
    and new.file_preview_url is not distinct from old.file_preview_url
    and new.file_preview_page_count is not distinct from old.file_preview_page_count
    and new.file_preview_status is not distinct from old.file_preview_status
    and new.file_preview_error is not distinct from old.file_preview_error
  then
    new.updated_at = old.updated_at;
  else
    new.updated_at = now();
  end if;

  return new;
end;
$function$;

create or replace function public.get_chat_message_by_id(
  p_message_id uuid
) returns public.chat_messages
language plpgsql
security definer
set search_path = public
as $function$
declare
  requester_id uuid := auth.uid();
  result public.chat_messages;
begin
  if requester_id is null then
    raise exception 'Not authenticated';
  end if;

  select cm.*
  into result
  from public.chat_messages cm
  where cm.id = p_message_id
    and (cm.sender_id = requester_id or cm.receiver_id = requester_id)
  limit 1;

  return result;
end;
$function$;

create or replace function public.list_undelivered_incoming_message_ids(
  p_limit integer default 201,
  p_offset integer default 0
) returns uuid[]
language plpgsql
security definer
set search_path = public
as $function$
declare
  requester_id uuid := auth.uid();
  normalized_limit integer := greatest(1, least(coalesce(p_limit, 201), 501));
  normalized_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if requester_id is null then
    raise exception 'Not authenticated';
  end if;

  return coalesce(
    (
      select array_agg(cm.id)
      from (
        select chat_message.id
        from public.chat_messages chat_message
        where chat_message.receiver_id = requester_id
          and coalesce(chat_message.is_delivered, false) = false
        order by chat_message.created_at asc, chat_message.id asc
        offset normalized_offset
        limit normalized_limit
      ) cm
    ),
    '{}'::uuid[]
  );
end;
$function$;

create or replace function public.get_user_presence(
  p_user_id uuid
) returns public.user_presence
language plpgsql
security definer
set search_path = public
as $function$
declare
  result public.user_presence;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select up.*
  into result
  from public.user_presence up
  where up.user_id = p_user_id
  limit 1;

  return result;
end;
$function$;

create or replace function public.list_active_user_presence_since(
  p_since timestamptz
) returns setof public.user_presence
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select up.*
  from public.user_presence up
  where up.is_online = true
    and up.last_seen >= p_since
  order by up.last_seen desc, up.user_id asc;
end;
$function$;

create or replace function public.list_chat_directory_users(
  p_limit integer default 31,
  p_offset integer default 0
) returns table (
  id uuid,
  name character varying,
  email character varying,
  profilephoto text
)
language plpgsql
security definer
set search_path = public
as $function$
declare
  normalized_limit integer := greatest(1, least(coalesce(p_limit, 31), 101));
  normalized_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select user_row.id, user_row.name, user_row.email, user_row.profilephoto
  from public.users user_row
  order by user_row.name asc, user_row.id asc
  offset normalized_offset
  limit normalized_limit;
end;
$function$;

revoke all on function public.get_chat_message_by_id(uuid) from public;
revoke all on function public.get_chat_message_by_id(uuid) from anon;
revoke all on function public.get_chat_message_by_id(uuid) from authenticated;
grant execute on function public.get_chat_message_by_id(uuid) to authenticated;
grant execute on function public.get_chat_message_by_id(uuid) to service_role;

revoke all on function public.list_undelivered_incoming_message_ids(integer, integer) from public;
revoke all on function public.list_undelivered_incoming_message_ids(integer, integer) from anon;
revoke all on function public.list_undelivered_incoming_message_ids(integer, integer) from authenticated;
grant execute on function public.list_undelivered_incoming_message_ids(integer, integer) to authenticated;
grant execute on function public.list_undelivered_incoming_message_ids(integer, integer) to service_role;

revoke all on function public.get_user_presence(uuid) from public;
revoke all on function public.get_user_presence(uuid) from anon;
revoke all on function public.get_user_presence(uuid) from authenticated;
grant execute on function public.get_user_presence(uuid) to authenticated;
grant execute on function public.get_user_presence(uuid) to service_role;

revoke all on function public.list_active_user_presence_since(timestamptz) from public;
revoke all on function public.list_active_user_presence_since(timestamptz) from anon;
revoke all on function public.list_active_user_presence_since(timestamptz) from authenticated;
grant execute on function public.list_active_user_presence_since(timestamptz) to authenticated;
grant execute on function public.list_active_user_presence_since(timestamptz) to service_role;

revoke all on function public.list_chat_directory_users(integer, integer) from public;
revoke all on function public.list_chat_directory_users(integer, integer) from anon;
revoke all on function public.list_chat_directory_users(integer, integer) from authenticated;
grant execute on function public.list_chat_directory_users(integer, integer) to authenticated;
grant execute on function public.list_chat_directory_users(integer, integer) to service_role;

commit;
