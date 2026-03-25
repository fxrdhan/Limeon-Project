begin;

create or replace function public.search_chat_messages(
  p_target_user_id uuid,
  p_channel_id text default null,
  p_query text default null,
  p_limit integer default 200
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
  order by scoped_message.created_at asc, scoped_message.id asc
  limit normalized_limit;
end;
$function$;

create or replace function public.fetch_chat_message_context(
  p_target_user_id uuid,
  p_channel_id text default null,
  p_message_id uuid default null,
  p_before_limit integer default 20,
  p_after_limit integer default 20
) returns setof public.chat_messages
language plpgsql
security definer
set search_path = public
as $function$
declare
  requester_id uuid := auth.uid();
  expected_channel_id text;
  normalized_before_limit integer := greatest(
    0,
    least(coalesce(p_before_limit, 20), 100)
  );
  normalized_after_limit integer := greatest(
    0,
    least(coalesce(p_after_limit, 20), 100)
  );
begin
  if requester_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_user_id is null then
    raise exception 'Target user is required';
  end if;

  if p_message_id is null then
    raise exception 'Message id is required';
  end if;

  expected_channel_id := public.compute_dm_channel_id(
    requester_id,
    p_target_user_id
  );

  if coalesce(p_channel_id, expected_channel_id) <> expected_channel_id then
    raise exception 'Invalid channel_id';
  end if;

  return query
  with target_message as (
    select cm.*
    from public.chat_messages cm
    where cm.id = p_message_id
      and (
        (cm.sender_id = requester_id and cm.receiver_id = p_target_user_id)
        or (cm.sender_id = p_target_user_id and cm.receiver_id = requester_id)
      )
      and cm.channel_id = expected_channel_id
    limit 1
  ),
  older_messages as (
    select cm.*
    from public.chat_messages cm
    cross join target_message tm
    where (
        (cm.sender_id = requester_id and cm.receiver_id = p_target_user_id)
        or (cm.sender_id = p_target_user_id and cm.receiver_id = requester_id)
      )
      and cm.channel_id = expected_channel_id
      and (cm.created_at, cm.id) <= (tm.created_at, tm.id)
    order by cm.created_at desc, cm.id desc
    limit normalized_before_limit + 1
  ),
  newer_messages as (
    select cm.*
    from public.chat_messages cm
    cross join target_message tm
    where (
        (cm.sender_id = requester_id and cm.receiver_id = p_target_user_id)
        or (cm.sender_id = p_target_user_id and cm.receiver_id = requester_id)
      )
      and cm.channel_id = expected_channel_id
      and (cm.created_at, cm.id) > (tm.created_at, tm.id)
    order by cm.created_at asc, cm.id asc
    limit normalized_after_limit
  )
  select context_message.*
  from (
    select * from older_messages
    union all
    select * from newer_messages
  ) context_message
  order by context_message.created_at asc, context_message.id asc;
end;
$function$;

revoke all on function public.search_chat_messages(uuid, text, text, integer) from public;
revoke all on function public.search_chat_messages(uuid, text, text, integer) from anon;
revoke all on function public.search_chat_messages(uuid, text, text, integer) from authenticated;
grant execute on function public.search_chat_messages(uuid, text, text, integer) to authenticated;
grant execute on function public.search_chat_messages(uuid, text, text, integer) to service_role;

revoke all on function public.fetch_chat_message_context(uuid, text, uuid, integer, integer) from public;
revoke all on function public.fetch_chat_message_context(uuid, text, uuid, integer, integer) from anon;
revoke all on function public.fetch_chat_message_context(uuid, text, uuid, integer, integer) from authenticated;
grant execute on function public.fetch_chat_message_context(uuid, text, uuid, integer, integer) to authenticated;
grant execute on function public.fetch_chat_message_context(uuid, text, uuid, integer, integer) to service_role;

commit;
