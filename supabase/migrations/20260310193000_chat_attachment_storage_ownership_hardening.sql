begin;

create or replace function public.validate_chat_attachment_storage_paths()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  normalized_storage_path text := nullif(btrim(new.file_storage_path), '');
  normalized_preview_path text := nullif(btrim(new.file_preview_url), '');
  storage_folder text := split_part(coalesce(normalized_storage_path, ''), '/', 1);
  storage_channel_id text := split_part(
    coalesce(normalized_storage_path, ''),
    '/',
    2
  );
  storage_owner_segment text := split_part(
    coalesce(normalized_storage_path, ''),
    '/',
    3
  );
  preview_folder text := split_part(coalesce(normalized_preview_path, ''), '/', 1);
  preview_channel_id text := split_part(
    coalesce(normalized_preview_path, ''),
    '/',
    2
  );
  preview_owner_segment text := split_part(
    coalesce(normalized_preview_path, ''),
    '/',
    3
  );
  expected_owner_prefix text := new.sender_id::text || '_';
begin
  if new.message_type in ('image', 'file') then
    if normalized_storage_path is null then
      raise exception 'Attachment message requires file_storage_path';
    end if;

    if storage_channel_id is distinct from new.channel_id then
      raise exception 'Attachment storage path must match the message channel';
    end if;

    if storage_owner_segment = ''
      or storage_owner_segment not like expected_owner_prefix || '%' then
      raise exception 'Attachment storage path must belong to the sender';
    end if;

    if new.message_type = 'image' and storage_folder <> 'images' then
      raise exception 'Image messages must use the images chat folder';
    end if;

    if new.message_type = 'file'
      and coalesce(new.file_kind, 'document') = 'audio'
      and storage_folder <> 'audio' then
      raise exception 'Audio messages must use the audio chat folder';
    end if;

    if new.message_type = 'file'
      and coalesce(new.file_kind, 'document') <> 'audio'
      and storage_folder <> 'documents' then
      raise exception 'Document messages must use the documents chat folder';
    end if;
  end if;

  if normalized_preview_path is not null then
    if new.message_type <> 'file' then
      raise exception 'Only file messages can store preview metadata';
    end if;

    if preview_folder <> 'previews' then
      raise exception 'File preview path must use the previews chat folder';
    end if;

    if preview_channel_id is distinct from new.channel_id then
      raise exception 'File preview path must match the message channel';
    end if;

    if preview_owner_segment = ''
      or preview_owner_segment not like expected_owner_prefix || '%' then
      raise exception 'File preview path must belong to the sender';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists validate_chat_attachment_storage_paths
on public.chat_messages;

create trigger validate_chat_attachment_storage_paths
before insert or update of
  message_type,
  file_storage_path,
  file_preview_url,
  file_kind,
  sender_id,
  channel_id
on public.chat_messages
for each row
execute function public.validate_chat_attachment_storage_paths();

commit;
