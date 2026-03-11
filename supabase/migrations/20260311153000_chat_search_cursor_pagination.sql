begin;

drop function if exists public.search_chat_messages(uuid, text, text, integer);
drop function if exists public.search_chat_messages(uuid, text, text, integer, timestamp with time zone, uuid);

create or replace function public.search_chat_messages(
  p_target_user_id uuid,
  p_channel_id text default null,
  p_query text default null,
  p_limit integer default 200,
  p_after_created_at timestamp with time zone default null,
  p_after_id uuid default null
) returns setof public.chat_messages
language plpgsql
security definer
set search_path = public
as $function$
declare
  requester_id uuid := auth.uid();
  expected_channel_id text;
  normalized_query text := nullif(btrim(coalesce(p_query, '')), '');
  normalized_limit integer := greatest(1, least(coalesce(p_limit, 200), 500));
begin
  if requester_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_user_id is null then
    raise exception 'Target user is required';
  end if;

  if normalized_query is null then
    return;
  end if;

  if (p_after_created_at is null) <> (p_after_id is null) then
    raise exception 'Search cursor is incomplete';
  end if;

  expected_channel_id := public.compute_dm_channel_id(
    requester_id,
    p_target_user_id
  );

  if coalesce(p_channel_id, expected_channel_id) <> expected_channel_id then
    raise exception 'Invalid channel_id';
  end if;

  return query
  with scoped_messages as (
    select cm.*
    from public.chat_messages cm
    where (
        (cm.sender_id = requester_id and cm.receiver_id = p_target_user_id)
        or (cm.sender_id = p_target_user_id and cm.receiver_id = requester_id)
      )
      and cm.channel_id = expected_channel_id
      and cm.message_relation_kind is distinct from 'attachment_caption'
  )
  select scoped_message.*
  from scoped_messages scoped_message
  where (
      (
        scoped_message.message_type = 'text'
        and scoped_message.message ilike '%' || normalized_query || '%'
      )
      or (
        scoped_message.message_type in ('image', 'file')
        and (
          coalesce(scoped_message.file_name, '') ilike '%' || normalized_query || '%'
          or exists (
            select 1
            from public.chat_messages attachment_caption
            where attachment_caption.reply_to_id = scoped_message.id
              and attachment_caption.message_relation_kind = 'attachment_caption'
              and attachment_caption.message ilike '%' || normalized_query || '%'
          )
        )
      )
    )
    and (
      p_after_created_at is null
      or (scoped_message.created_at, scoped_message.id) > (p_after_created_at, p_after_id)
    )
  order by scoped_message.created_at asc, scoped_message.id asc
  limit normalized_limit;
end;
$function$;

revoke all on function public.search_chat_messages(uuid, text, text, integer, timestamp with time zone, uuid) from public;
revoke all on function public.search_chat_messages(uuid, text, text, integer, timestamp with time zone, uuid) from anon;
revoke all on function public.search_chat_messages(uuid, text, text, integer, timestamp with time zone, uuid) from authenticated;
grant execute on function public.search_chat_messages(uuid, text, text, integer, timestamp with time zone, uuid) to authenticated;
grant execute on function public.search_chat_messages(uuid, text, text, integer, timestamp with time zone, uuid) to service_role;

commit;
