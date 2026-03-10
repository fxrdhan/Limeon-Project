begin;

create or replace function public.sync_user_presence_on_exit(
  p_user_id uuid,
  p_is_online boolean default false,
  p_last_seen timestamptz default now()
) returns public.user_presence
language plpgsql
security definer
set search_path = public
as $function$
declare
  result public.user_presence;
  normalized_last_seen timestamptz := coalesce(p_last_seen, now());
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if auth.uid() <> p_user_id then
    raise exception 'Forbidden';
  end if;

  insert into public.user_presence (
    user_id,
    is_online,
    last_seen,
    updated_at
  )
  values (
    p_user_id,
    coalesce(p_is_online, false),
    normalized_last_seen,
    normalized_last_seen
  )
  on conflict (user_id)
  do update
  set
    is_online = coalesce(p_is_online, public.user_presence.is_online),
    last_seen = normalized_last_seen,
    updated_at = normalized_last_seen
  returning * into result;

  return result;
end;
$function$;

revoke all on function public.sync_user_presence_on_exit(uuid, boolean, timestamptz) from public;
revoke all on function public.sync_user_presence_on_exit(uuid, boolean, timestamptz) from anon;
revoke all on function public.sync_user_presence_on_exit(uuid, boolean, timestamptz) from authenticated;
grant execute on function public.sync_user_presence_on_exit(uuid, boolean, timestamptz) to authenticated;
grant execute on function public.sync_user_presence_on_exit(uuid, boolean, timestamptz) to service_role;

commit;
