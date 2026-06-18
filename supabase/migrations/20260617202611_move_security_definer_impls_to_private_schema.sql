begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
grant usage on schema private to service_role;

alter function public.create_chat_message(
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
) set schema private;
alter function public.current_user_can_view_presence(uuid) set schema private;
alter function public.current_user_is_admin() set schema private;
alter function public.delete_chat_message_thread(uuid) set schema private;
alter function public.edit_chat_message_text(uuid, text, timestamptz) set schema private;
alter function public.fetch_chat_message_context(uuid, text, uuid, integer, integer) set schema private;
alter function public.fetch_chat_messages_page(uuid, text, timestamptz, uuid, integer) set schema private;
alter function public.get_chat_message_by_id(uuid) set schema private;
alter function public.hard_rollback_entity(text, uuid, integer) set schema private;
alter function public.list_undelivered_incoming_message_ids(integer, integer) set schema private;
alter function public.mark_chat_message_ids_as_delivered(uuid[]) set schema private;
alter function public.mark_chat_message_ids_as_read(uuid[]) set schema private;
alter function public.mark_chat_messages_as_delivered(uuid, uuid, text) set schema private;
alter function public.mark_chat_messages_as_read(uuid, uuid, text) set schema private;
alter function public.search_chat_messages(uuid, text, text, integer, timestamptz, uuid) set schema private;
alter function public.sync_user_presence_on_exit(uuid, boolean, timestamptz) set schema private;
alter function public.update_chat_file_preview_metadata(uuid, text, integer, character varying, text) set schema private;
alter function public.upsert_user_presence(uuid, boolean, timestamptz) set schema private;

create or replace function public.create_chat_message(
  p_receiver_id uuid,
  p_message text,
  p_message_type character varying default 'text',
  p_reply_to_id uuid default null,
  p_message_relation_kind text default null,
  p_file_name text default null,
  p_file_kind character varying default null,
  p_file_mime_type text default null,
  p_file_size bigint default null,
  p_file_storage_path text default null,
  p_file_preview_url text default null,
  p_file_preview_page_count integer default null,
  p_file_preview_status character varying default null,
  p_file_preview_error text default null
)
returns public.chat_messages
language sql
security invoker
set search_path = public, private
as $function$
  select private.create_chat_message(
    p_receiver_id,
    p_message,
    p_message_type,
    p_reply_to_id,
    p_message_relation_kind,
    p_file_name,
    p_file_kind,
    p_file_mime_type,
    p_file_size,
    p_file_storage_path,
    p_file_preview_url,
    p_file_preview_page_count,
    p_file_preview_status,
    p_file_preview_error
  );
$function$;

create or replace function public.current_user_can_view_presence(
  p_user_id uuid
)
returns boolean
language sql
security invoker
set search_path = public, private
as $function$
  select private.current_user_can_view_presence(p_user_id);
$function$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
security invoker
set search_path = public, private
as $function$
  select private.current_user_is_admin();
$function$;

create or replace function public.delete_chat_message_thread(
  p_message_id uuid
)
returns uuid[]
language sql
security invoker
set search_path = public, private
as $function$
  select private.delete_chat_message_thread(p_message_id);
$function$;

create or replace function public.edit_chat_message_text(
  p_message_id uuid,
  p_message text,
  p_updated_at timestamptz default now()
)
returns public.chat_messages
language sql
security invoker
set search_path = public, private
as $function$
  select private.edit_chat_message_text(p_message_id, p_message, p_updated_at);
$function$;

create or replace function public.fetch_chat_message_context(
  p_target_user_id uuid,
  p_channel_id text default null,
  p_message_id uuid default null,
  p_before_limit integer default 20,
  p_after_limit integer default 20
)
returns setof public.chat_messages
language sql
security invoker
set search_path = public, private
as $function$
  select *
  from private.fetch_chat_message_context(
    p_target_user_id,
    p_channel_id,
    p_message_id,
    p_before_limit,
    p_after_limit
  );
$function$;

create or replace function public.fetch_chat_messages_page(
  p_target_user_id uuid,
  p_channel_id text default null,
  p_before_created_at timestamptz default null,
  p_before_id uuid default null,
  p_limit integer default 51
)
returns setof public.chat_messages
language sql
security invoker
set search_path = public, private
as $function$
  select *
  from private.fetch_chat_messages_page(
    p_target_user_id,
    p_channel_id,
    p_before_created_at,
    p_before_id,
    p_limit
  );
$function$;

create or replace function public.get_chat_message_by_id(
  p_message_id uuid
)
returns public.chat_messages
language sql
security invoker
set search_path = public, private
as $function$
  select private.get_chat_message_by_id(p_message_id);
$function$;

create or replace function public.hard_rollback_entity(
  p_entity_table text,
  p_entity_id uuid,
  p_target_version integer
)
returns jsonb
language sql
security invoker
set search_path = public, private
as $function$
  select private.hard_rollback_entity(
    p_entity_table,
    p_entity_id,
    p_target_version
  );
$function$;

create or replace function public.list_undelivered_incoming_message_ids(
  p_limit integer default 201,
  p_offset integer default 0
)
returns uuid[]
language sql
security invoker
set search_path = public, private
as $function$
  select private.list_undelivered_incoming_message_ids(p_limit, p_offset);
$function$;

create or replace function public.mark_chat_message_ids_as_delivered(
  p_message_ids uuid[]
)
returns setof public.chat_messages
language sql
security invoker
set search_path = public, private
as $function$
  select *
  from private.mark_chat_message_ids_as_delivered(p_message_ids);
$function$;

create or replace function public.mark_chat_message_ids_as_read(
  p_message_ids uuid[]
)
returns setof public.chat_messages
language sql
security invoker
set search_path = public, private
as $function$
  select *
  from private.mark_chat_message_ids_as_read(p_message_ids);
$function$;

create or replace function public.mark_chat_messages_as_delivered(
  p_sender_id uuid,
  p_receiver_id uuid,
  p_channel_id text default null
)
returns setof public.chat_messages
language sql
security invoker
set search_path = public, private
as $function$
  select *
  from private.mark_chat_messages_as_delivered(
    p_sender_id,
    p_receiver_id,
    p_channel_id
  );
$function$;

create or replace function public.mark_chat_messages_as_read(
  p_sender_id uuid,
  p_receiver_id uuid,
  p_channel_id text default null
)
returns setof public.chat_messages
language sql
security invoker
set search_path = public, private
as $function$
  select *
  from private.mark_chat_messages_as_read(
    p_sender_id,
    p_receiver_id,
    p_channel_id
  );
$function$;

create or replace function public.search_chat_messages(
  p_target_user_id uuid,
  p_channel_id text default null,
  p_query text default null,
  p_limit integer default 200,
  p_after_created_at timestamptz default null,
  p_after_id uuid default null
)
returns setof public.chat_messages
language sql
security invoker
set search_path = public, private
as $function$
  select *
  from private.search_chat_messages(
    p_target_user_id,
    p_channel_id,
    p_query,
    p_limit,
    p_after_created_at,
    p_after_id
  );
$function$;

create or replace function public.sync_user_presence_on_exit(
  p_user_id uuid,
  p_is_online boolean default false,
  p_last_seen timestamptz default now()
)
returns public.user_presence
language sql
security invoker
set search_path = public, private
as $function$
  select private.sync_user_presence_on_exit(
    p_user_id,
    p_is_online,
    p_last_seen
  );
$function$;

create or replace function public.update_chat_file_preview_metadata(
  p_message_id uuid,
  p_file_preview_url text default null,
  p_file_preview_page_count integer default null,
  p_file_preview_status character varying default null,
  p_file_preview_error text default null
)
returns public.chat_messages
language sql
security invoker
set search_path = public, private
as $function$
  select private.update_chat_file_preview_metadata(
    p_message_id,
    p_file_preview_url,
    p_file_preview_page_count,
    p_file_preview_status,
    p_file_preview_error
  );
$function$;

create or replace function public.upsert_user_presence(
  p_user_id uuid,
  p_is_online boolean default null,
  p_last_chat_opened timestamptz default null
)
returns public.user_presence
language sql
security invoker
set search_path = public, private
as $function$
  select private.upsert_user_presence(
    p_user_id,
    p_is_online,
    p_last_chat_opened
  );
$function$;

revoke all on all functions in schema private from public;
revoke all on all functions in schema private from anon;
grant execute on all functions in schema private to authenticated;
grant execute on all functions in schema private to service_role;

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
) from public;
grant execute on function public.create_chat_message(
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
) to authenticated, service_role;

revoke all on function public.current_user_can_view_presence(uuid) from public;
grant execute on function public.current_user_can_view_presence(uuid) to authenticated, service_role;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated, service_role;

revoke all on function public.delete_chat_message_thread(uuid) from public;
grant execute on function public.delete_chat_message_thread(uuid) to authenticated, service_role;

revoke all on function public.edit_chat_message_text(uuid, text, timestamptz) from public;
grant execute on function public.edit_chat_message_text(uuid, text, timestamptz) to authenticated, service_role;

revoke all on function public.fetch_chat_message_context(uuid, text, uuid, integer, integer) from public;
grant execute on function public.fetch_chat_message_context(uuid, text, uuid, integer, integer) to authenticated, service_role;

revoke all on function public.fetch_chat_messages_page(uuid, text, timestamptz, uuid, integer) from public;
grant execute on function public.fetch_chat_messages_page(uuid, text, timestamptz, uuid, integer) to authenticated, service_role;

revoke all on function public.get_chat_message_by_id(uuid) from public;
grant execute on function public.get_chat_message_by_id(uuid) to authenticated, service_role;

revoke all on function public.hard_rollback_entity(text, uuid, integer) from public;
grant execute on function public.hard_rollback_entity(text, uuid, integer) to authenticated, service_role;

revoke all on function public.list_undelivered_incoming_message_ids(integer, integer) from public;
grant execute on function public.list_undelivered_incoming_message_ids(integer, integer) to authenticated, service_role;

revoke all on function public.mark_chat_message_ids_as_delivered(uuid[]) from public;
grant execute on function public.mark_chat_message_ids_as_delivered(uuid[]) to authenticated, service_role;

revoke all on function public.mark_chat_message_ids_as_read(uuid[]) from public;
grant execute on function public.mark_chat_message_ids_as_read(uuid[]) to authenticated, service_role;

revoke all on function public.mark_chat_messages_as_delivered(uuid, uuid, text) from public;
grant execute on function public.mark_chat_messages_as_delivered(uuid, uuid, text) to authenticated, service_role;

revoke all on function public.mark_chat_messages_as_read(uuid, uuid, text) from public;
grant execute on function public.mark_chat_messages_as_read(uuid, uuid, text) to authenticated, service_role;

revoke all on function public.search_chat_messages(uuid, text, text, integer, timestamptz, uuid) from public;
grant execute on function public.search_chat_messages(uuid, text, text, integer, timestamptz, uuid) to authenticated, service_role;

revoke all on function public.sync_user_presence_on_exit(uuid, boolean, timestamptz) from public;
grant execute on function public.sync_user_presence_on_exit(uuid, boolean, timestamptz) to authenticated, service_role;

revoke all on function public.update_chat_file_preview_metadata(uuid, text, integer, character varying, text) from public;
grant execute on function public.update_chat_file_preview_metadata(uuid, text, integer, character varying, text) to authenticated, service_role;

revoke all on function public.upsert_user_presence(uuid, boolean, timestamptz) from public;
grant execute on function public.upsert_user_presence(uuid, boolean, timestamptz) to authenticated, service_role;

commit;
