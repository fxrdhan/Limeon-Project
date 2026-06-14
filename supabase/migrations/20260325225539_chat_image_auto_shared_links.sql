begin;

create or replace function public.assign_chat_image_shared_link()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  normalized_storage_path text := nullif(btrim(new.file_storage_path), '');
  ensured_link public.chat_shared_links;
  next_slug text;
  attempt_index integer;
begin
  if new.message_type <> 'image' or normalized_storage_path is null then
    new.shared_link_slug := null;
    return new;
  end if;

  if new.id is null then
    new.id := gen_random_uuid();
  end if;

  select *
  into ensured_link
  from public.chat_shared_links
  where message_id = new.id
    and revoked_at is null
  limit 1;

  if ensured_link.id is null then
    select *
    into ensured_link
    from public.chat_shared_links
    where storage_path = normalized_storage_path
      and revoked_at is null
    limit 1;

    if ensured_link.id is not null
      and ensured_link.message_id is distinct from new.id
    then
      update public.chat_shared_links
      set
        message_id = new.id,
        updated_at = now()
      where id = ensured_link.id;
    end if;
  end if;

  if ensured_link.id is null then
    for attempt_index in 1..6 loop
      next_slug := public.generate_chat_shared_link_slug();

      begin
        insert into public.chat_shared_links (
          slug,
          storage_path,
          created_by,
          message_id
        )
        values (
          next_slug,
          normalized_storage_path,
          new.sender_id,
          new.id
        )
        returning *
        into ensured_link;

        exit;
      exception
        when unique_violation then
          select *
          into ensured_link
          from public.chat_shared_links
          where message_id = new.id
            and revoked_at is null
          limit 1;

          if ensured_link.id is not null then
            exit;
          end if;

          select *
          into ensured_link
          from public.chat_shared_links
          where storage_path = normalized_storage_path
            and revoked_at is null
          limit 1;

          if ensured_link.id is not null then
            if ensured_link.message_id is distinct from new.id then
              update public.chat_shared_links
              set
                message_id = new.id,
                updated_at = now()
              where id = ensured_link.id;
            end if;

            exit;
          end if;
      end;
    end loop;
  end if;

  if ensured_link.id is null then
    raise exception 'Failed to ensure chat image shared link';
  end if;

  new.file_storage_path := normalized_storage_path;
  new.shared_link_slug := ensured_link.slug;
  return new;
end;
$function$;

drop trigger if exists assign_chat_image_shared_link
on public.chat_messages;

create trigger assign_chat_image_shared_link
before insert or update of
  message_type,
  file_storage_path,
  sender_id
on public.chat_messages
for each row
execute function public.assign_chat_image_shared_link();

commit;
