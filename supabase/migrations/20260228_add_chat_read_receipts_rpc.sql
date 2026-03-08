begin;

alter table public.chat_messages
  add column if not exists is_delivered boolean not null default false;

create or replace function public.update_chat_messages_updated_at()
returns trigger
language plpgsql
as $function$
begin
  if
    (
      new.is_read is distinct from old.is_read
      or new.is_delivered is distinct from old.is_delivered
    )
    and new.sender_id is not distinct from old.sender_id
    and new.receiver_id is not distinct from old.receiver_id
    and new.channel_id is not distinct from old.channel_id
    and new.message is not distinct from old.message
    and new.message_type is not distinct from old.message_type
    and new.reply_to_id is not distinct from old.reply_to_id
    and new.file_name is not distinct from old.file_name
    and new.file_kind is not distinct from old.file_kind
    and new.file_mime_type is not distinct from old.file_mime_type
    and new.file_size is not distinct from old.file_size
    and new.file_storage_path is not distinct from old.file_storage_path
    and new.file_preview_url is not distinct from old.file_preview_url
    and new.file_preview_page_count is not distinct from old.file_preview_page_count
    and new.file_preview_status is not distinct from old.file_preview_status
    and new.file_preview_error is not distinct from old.file_preview_error
  then
    new.updated_at = old.updated_at;
  else
    new.updated_at = now();
  end if;

  return new;
end;
$function$;

create or replace function public.mark_chat_messages_as_read(
  p_sender_id uuid,
  p_receiver_id uuid,
  p_channel_id text default null
)
returns setof public.chat_messages
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if auth.uid() is distinct from p_receiver_id then
    raise exception 'Forbidden';
  end if;

  return query
  update public.chat_messages cm
  set
    is_read = true,
    is_delivered = true
  where cm.sender_id = p_sender_id
    and cm.receiver_id = p_receiver_id
    and (p_channel_id is null or cm.channel_id = p_channel_id)
    and coalesce(cm.is_read, false) = false
  returning cm.*;
end;
$function$;

create or replace function public.mark_chat_messages_as_delivered(
  p_sender_id uuid,
  p_receiver_id uuid,
  p_channel_id text default null
)
returns setof public.chat_messages
language plpgsql
security definer
set search_path = public
as $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if auth.uid() is distinct from p_receiver_id then
    raise exception 'Forbidden';
  end if;

  return query
  update public.chat_messages cm
  set is_delivered = true
  where cm.sender_id = p_sender_id
    and cm.receiver_id = p_receiver_id
    and (p_channel_id is null or cm.channel_id = p_channel_id)
    and coalesce(cm.is_delivered, false) = false
  returning cm.*;
end;
$function$;

revoke all on function public.mark_chat_messages_as_read(uuid, uuid, text) from public;
grant execute on function public.mark_chat_messages_as_read(uuid, uuid, text) to authenticated;
revoke all on function public.mark_chat_messages_as_delivered(uuid, uuid, text) from public;
grant execute on function public.mark_chat_messages_as_delivered(uuid, uuid, text) to authenticated;

commit;
