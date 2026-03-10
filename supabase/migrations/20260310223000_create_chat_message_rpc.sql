begin;

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
  p_file_storage_path text default null
) returns public.chat_messages
language plpgsql
security definer
set search_path = public
as $function$
declare
  requester_id uuid := auth.uid();
  inserted_message public.chat_messages;
  expected_channel_id text;
begin
  if requester_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_receiver_id is null then
    raise exception 'Receiver is required';
  end if;

  expected_channel_id := public.compute_dm_channel_id(
    requester_id,
    p_receiver_id
  );

  insert into public.chat_messages (
    sender_id,
    receiver_id,
    channel_id,
    message,
    message_type,
    reply_to_id,
    message_relation_kind,
    file_name,
    file_kind,
    file_mime_type,
    file_size,
    file_storage_path
  )
  values (
    requester_id,
    p_receiver_id,
    expected_channel_id,
    p_message,
    coalesce(p_message_type, 'text'),
    p_reply_to_id,
    p_message_relation_kind,
    p_file_name,
    p_file_kind,
    p_file_mime_type,
    p_file_size,
    p_file_storage_path
  )
  returning * into inserted_message;

  return inserted_message;
end;
$function$;

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
  text
) from public;
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
  text
) from anon;
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
  text
) from authenticated;
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
  text
) to authenticated;
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
  text
) to service_role;

commit;
