drop function if exists public.list_chat_directory_users(integer, integer);

create function public.list_chat_directory_users(
  p_limit integer default 31,
  p_offset integer default 0
) returns table (
  id uuid,
  name character varying,
  email character varying,
  profilephoto text,
  profilephoto_thumb text,
  last_message text,
  last_message_created_at timestamp with time zone
)
language plpgsql
security invoker
set search_path = public
as $function$
declare
  requester_id uuid := auth.uid();
  normalized_limit integer := greatest(1, least(coalesce(p_limit, 31), 101));
  normalized_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if requester_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    user_row.id,
    user_row.name,
    user_row.email,
    user_row.profilephoto,
    user_row.profilephoto_thumb,
    latest_message.preview_text,
    latest_message.created_at
  from public.users user_row
  left join lateral (
    select
      case
        when chat_message.message_type = 'image' then
          coalesce(nullif(chat_message.message, ''), 'Gambar')
        when chat_message.message_type = 'file' then
          coalesce(
            nullif(chat_message.message, ''),
            nullif(chat_message.file_name, ''),
            'File'
          )
        else chat_message.message
      end as preview_text,
      chat_message.created_at
    from public.chat_messages chat_message
    where (
      chat_message.sender_id = requester_id
      and chat_message.receiver_id = user_row.id
    )
    or (
      chat_message.receiver_id = requester_id
      and chat_message.sender_id = user_row.id
    )
    order by chat_message.created_at desc, chat_message.id desc
    limit 1
  ) latest_message on true
  where user_row.id = requester_id
    or public.current_user_is_admin()
    or latest_message.created_at is not null
  order by
    latest_message.created_at desc nulls last,
    user_row.name asc,
    user_row.id asc
  offset normalized_offset
  limit normalized_limit;
end;
$function$;

revoke all on function public.list_chat_directory_users(integer, integer) from public;
revoke all on function public.list_chat_directory_users(integer, integer) from anon;
revoke all on function public.list_chat_directory_users(integer, integer) from authenticated;
grant execute on function public.list_chat_directory_users(integer, integer) to authenticated;
grant execute on function public.list_chat_directory_users(integer, integer) to service_role;
