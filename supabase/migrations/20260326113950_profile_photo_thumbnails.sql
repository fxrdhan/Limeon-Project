begin;

alter table public.users
  add column if not exists profilephoto_thumb text;

comment on column public.users.profilephoto is 'Public URL for the original profile photo asset';
comment on column public.users.profilephoto_thumb is 'Public URL for the small square profile photo thumbnail asset';
comment on column public.users.profilephoto_path is 'Storage path for the original profile photo asset';

drop function if exists public.list_chat_directory_users(integer, integer);

create function public.list_chat_directory_users(
  p_limit integer default 31,
  p_offset integer default 0
) returns table (
  id uuid,
  name character varying,
  email character varying,
  profilephoto text,
  profilephoto_thumb text
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
  select
    user_row.id,
    user_row.name,
    user_row.email,
    user_row.profilephoto,
    user_row.profilephoto_thumb
  from public.users user_row
  order by user_row.name asc, user_row.id asc
  offset normalized_offset
  limit normalized_limit;
end;
$function$;

revoke all on function public.list_chat_directory_users(integer, integer) from public;
revoke all on function public.list_chat_directory_users(integer, integer) from anon;
revoke all on function public.list_chat_directory_users(integer, integer) from authenticated;
grant execute on function public.list_chat_directory_users(integer, integer) to authenticated;
grant execute on function public.list_chat_directory_users(integer, integer) to service_role;

commit;
