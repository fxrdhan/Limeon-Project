begin;

create or replace function public.validate_chat_message_relations()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  parent_message public.chat_messages;
begin
  if new.reply_to_id is null then
    if new.message_relation_kind = 'attachment_caption' then
      raise exception 'Attachment caption requires reply_to_id';
    end if;

    return new;
  end if;

  select *
  into parent_message
  from public.chat_messages
  where id = new.reply_to_id;

  if parent_message.id is null then
    raise exception 'reply_to_id does not reference an existing chat message';
  end if;

  if parent_message.channel_id is distinct from new.channel_id then
    raise exception 'Reply target must belong to the same conversation';
  end if;

  if new.message_relation_kind = 'attachment_caption' then
    if parent_message.sender_id is distinct from new.sender_id
      or parent_message.receiver_id is distinct from new.receiver_id then
      raise exception 'Attachment caption must follow the attachment direction';
    end if;

    if parent_message.message_type not in ('image', 'file') then
      raise exception 'Attachment caption must reference an attachment message';
    end if;
  end if;

  return new;
end;
$function$;

commit;
