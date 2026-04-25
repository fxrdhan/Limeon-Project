begin;

create or replace function public.current_user_can_view_presence(
  p_user_id uuid
) returns boolean
language sql
security definer
set search_path = public
as $function$
  select
    auth.uid() = p_user_id
    or public.current_user_is_admin()
    or exists (
      select 1
      from public.chat_messages chat_message
      where (
        chat_message.sender_id = auth.uid()
        and chat_message.receiver_id = p_user_id
      )
      or (
        chat_message.receiver_id = auth.uid()
        and chat_message.sender_id = p_user_id
      )
    );
$function$;

revoke all on function public.current_user_can_view_presence(uuid) from public;
revoke all on function public.current_user_can_view_presence(uuid) from anon;
grant execute on function public.current_user_can_view_presence(uuid) to authenticated;
grant execute on function public.current_user_can_view_presence(uuid) to service_role;

drop policy if exists "Users can view own presence or admins can view presence"
on public.user_presence;
create policy "Users can view own presence admins or chat contacts"
  on public.user_presence
  for select
  using (public.current_user_can_view_presence(user_id));

create or replace function public.get_user_presence(
  p_user_id uuid
) returns public.user_presence
language plpgsql
security invoker
set search_path = public
as $function$
declare
  result public.user_presence;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.current_user_can_view_presence(p_user_id) then
    return null;
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
security invoker
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
    and public.current_user_can_view_presence(up.user_id)
  order by up.last_seen desc, up.user_id asc;
end;
$function$;

commit;
