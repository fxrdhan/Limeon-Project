begin;

revoke all on function public.create_chat_message(
  uuid,
  text,
  character varying,
  uuid,
  text,
  text,
  character varying,
  text,
  bigint,
  text,
  text,
  integer,
  character varying,
  text
) from anon;

revoke all on function public.current_user_can_view_presence(uuid) from anon;
revoke all on function public.current_user_is_admin() from anon;
revoke all on function public.delete_chat_message_thread(uuid) from anon;
revoke all on function public.edit_chat_message_text(uuid, text, timestamptz) from anon;
revoke all on function public.fetch_chat_message_context(uuid, text, uuid, integer, integer) from anon;
revoke all on function public.fetch_chat_messages_page(uuid, text, timestamptz, uuid, integer) from anon;
revoke all on function public.get_chat_message_by_id(uuid) from anon;
revoke all on function public.hard_rollback_entity(text, uuid, integer) from anon;
revoke all on function public.list_undelivered_incoming_message_ids(integer, integer) from anon;
revoke all on function public.mark_chat_message_ids_as_delivered(uuid[]) from anon;
revoke all on function public.mark_chat_message_ids_as_read(uuid[]) from anon;
revoke all on function public.mark_chat_messages_as_delivered(uuid, uuid, text) from anon;
revoke all on function public.mark_chat_messages_as_read(uuid, uuid, text) from anon;
revoke all on function public.search_chat_messages(uuid, text, text, integer, timestamptz, uuid) from anon;
revoke all on function public.sync_user_presence_on_exit(uuid, boolean, timestamptz) from anon;
revoke all on function public.update_chat_file_preview_metadata(uuid, text, integer, character varying, text) from anon;
revoke all on function public.upsert_user_presence(uuid, boolean, timestamptz) from anon;

commit;
