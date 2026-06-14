begin;

drop trigger if exists assign_chat_message_shared_link
on public.chat_messages;

drop function if exists public.assign_chat_message_shared_link();

update public.chat_messages
set shared_link_slug = null
where shared_link_slug is not null;

update public.chat_shared_links
set
  revoked_at = now(),
  updated_at = now()
where revoked_at is null;

commit;
