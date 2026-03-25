begin;

drop policy if exists "Users can update their own messages" on public.chat_messages;

create or replace function public.edit_chat_message_text(
  p_message_id uuid,
  p_message text,
  p_updated_at timestamptz default now()
) returns public.chat_messages
language plpgsql
security definer
set search_path = public
as $function$
declare
  updated_message public.chat_messages;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.chat_messages cm
  set
    message = p_message,
    updated_at = coalesce(p_updated_at, now())
  where cm.id = p_message_id
    and cm.sender_id = auth.uid()
    and cm.message_type = 'text'
  returning cm.* into updated_message;

  if updated_message.id is null then
    raise exception 'Forbidden';
  end if;

  return updated_message;
end;
$function$;

create or replace function public.update_chat_file_preview_metadata(
  p_message_id uuid,
  p_file_preview_url text default null,
  p_file_preview_page_count integer default null,
  p_file_preview_status character varying default null,
  p_file_preview_error text default null
) returns public.chat_messages
language plpgsql
security definer
set search_path = public
as $function$
declare
  updated_message public.chat_messages;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.chat_messages cm
  set
    file_preview_url = p_file_preview_url,
    file_preview_page_count = p_file_preview_page_count,
    file_preview_status = p_file_preview_status,
    file_preview_error = p_file_preview_error
  where cm.id = p_message_id
    and cm.sender_id = auth.uid()
    and cm.message_type = 'file'
  returning cm.* into updated_message;

  if updated_message.id is null then
    raise exception 'Forbidden';
  end if;

  return updated_message;
end;
$function$;

revoke all on function public.edit_chat_message_text(uuid, text, timestamptz) from public;
grant execute on function public.edit_chat_message_text(uuid, text, timestamptz) to authenticated;

revoke all on function public.update_chat_file_preview_metadata(uuid, text, integer, character varying, text) from public;
grant execute on function public.update_chat_file_preview_metadata(uuid, text, integer, character varying, text) to authenticated;

commit;
