begin;

revoke all on function public.upsert_user_presence(uuid, boolean, timestamptz) from anon;
revoke all on function public.upsert_user_presence(uuid, boolean, timestamptz) from authenticated;
grant execute on function public.upsert_user_presence(uuid, boolean, timestamptz) to authenticated;
grant execute on function public.upsert_user_presence(uuid, boolean, timestamptz) to service_role;

revoke all on function public.edit_chat_message_text(uuid, text, timestamptz) from anon;
revoke all on function public.edit_chat_message_text(uuid, text, timestamptz) from authenticated;
grant execute on function public.edit_chat_message_text(uuid, text, timestamptz) to authenticated;
grant execute on function public.edit_chat_message_text(uuid, text, timestamptz) to service_role;

revoke all on function public.update_chat_file_preview_metadata(uuid, text, integer, character varying, text) from anon;
revoke all on function public.update_chat_file_preview_metadata(uuid, text, integer, character varying, text) from authenticated;
grant execute on function public.update_chat_file_preview_metadata(uuid, text, integer, character varying, text) to authenticated;
grant execute on function public.update_chat_file_preview_metadata(uuid, text, integer, character varying, text) to service_role;

do $$
begin
  if to_regprocedure('public.mark_chat_message_ids_as_delivered(uuid[])') is not null then
    revoke all on function public.mark_chat_message_ids_as_delivered(uuid[]) from anon;
    revoke all on function public.mark_chat_message_ids_as_delivered(uuid[]) from authenticated;
    grant execute on function public.mark_chat_message_ids_as_delivered(uuid[]) to authenticated;
    grant execute on function public.mark_chat_message_ids_as_delivered(uuid[]) to service_role;
  end if;

  if to_regprocedure('public.mark_chat_message_ids_as_read(uuid[])') is not null then
    revoke all on function public.mark_chat_message_ids_as_read(uuid[]) from anon;
    revoke all on function public.mark_chat_message_ids_as_read(uuid[]) from authenticated;
    grant execute on function public.mark_chat_message_ids_as_read(uuid[]) to authenticated;
    grant execute on function public.mark_chat_message_ids_as_read(uuid[]) to service_role;
  end if;
end
$$;

revoke all on function public.delete_chat_message_thread(uuid) from anon;
revoke all on function public.delete_chat_message_thread(uuid) from authenticated;
grant execute on function public.delete_chat_message_thread(uuid) to authenticated;
grant execute on function public.delete_chat_message_thread(uuid) to service_role;

commit;
