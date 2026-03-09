begin;

create or replace function public.upsert_user_presence(
  p_user_id uuid,
  p_is_online boolean default null,
  p_last_chat_opened timestamptz default null
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

  if auth.uid() <> p_user_id then
    raise exception 'Forbidden';
  end if;

  insert into public.user_presence (
    user_id,
    is_online,
    last_chat_opened,
    last_seen
  )
  values (
    p_user_id,
    coalesce(p_is_online, true),
    p_last_chat_opened,
    now()
  )
  on conflict (user_id)
  do update
  set
    is_online = coalesce(p_is_online, public.user_presence.is_online),
    last_chat_opened = coalesce(
      p_last_chat_opened,
      public.user_presence.last_chat_opened
    ),
    last_seen = now(),
    updated_at = now()
  returning * into result;

  return result;
end;
$function$;

revoke all on function public.upsert_user_presence(uuid, boolean, timestamptz) from public;
revoke all on function public.upsert_user_presence(uuid, boolean, timestamptz) from anon;
revoke all on function public.upsert_user_presence(uuid, boolean, timestamptz) from authenticated;
grant execute on function public.upsert_user_presence(uuid, boolean, timestamptz) to authenticated;
grant execute on function public.upsert_user_presence(uuid, boolean, timestamptz) to service_role;

revoke all on function public.edit_chat_message_text(uuid, text, timestamptz) from public;
revoke all on function public.edit_chat_message_text(uuid, text, timestamptz) from anon;
revoke all on function public.edit_chat_message_text(uuid, text, timestamptz) from authenticated;
grant execute on function public.edit_chat_message_text(uuid, text, timestamptz) to authenticated;
grant execute on function public.edit_chat_message_text(uuid, text, timestamptz) to service_role;

revoke all on function public.update_chat_file_preview_metadata(uuid, text, integer, character varying, text) from public;
revoke all on function public.update_chat_file_preview_metadata(uuid, text, integer, character varying, text) from anon;
revoke all on function public.update_chat_file_preview_metadata(uuid, text, integer, character varying, text) from authenticated;
grant execute on function public.update_chat_file_preview_metadata(uuid, text, integer, character varying, text) to authenticated;
grant execute on function public.update_chat_file_preview_metadata(uuid, text, integer, character varying, text) to service_role;

revoke all on function public.mark_chat_message_ids_as_delivered(uuid[]) from public;
revoke all on function public.mark_chat_message_ids_as_delivered(uuid[]) from anon;
revoke all on function public.mark_chat_message_ids_as_delivered(uuid[]) from authenticated;
grant execute on function public.mark_chat_message_ids_as_delivered(uuid[]) to authenticated;
grant execute on function public.mark_chat_message_ids_as_delivered(uuid[]) to service_role;

revoke all on function public.mark_chat_message_ids_as_read(uuid[]) from public;
revoke all on function public.mark_chat_message_ids_as_read(uuid[]) from anon;
revoke all on function public.mark_chat_message_ids_as_read(uuid[]) from authenticated;
grant execute on function public.mark_chat_message_ids_as_read(uuid[]) to authenticated;
grant execute on function public.mark_chat_message_ids_as_read(uuid[]) to service_role;

revoke all on function public.delete_chat_message_thread(uuid) from public;
revoke all on function public.delete_chat_message_thread(uuid) from anon;
revoke all on function public.delete_chat_message_thread(uuid) from authenticated;
grant execute on function public.delete_chat_message_thread(uuid) to authenticated;
grant execute on function public.delete_chat_message_thread(uuid) to service_role;

commit;
