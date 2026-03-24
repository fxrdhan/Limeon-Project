begin;

delete from public.chat_shared_links
where target_url is not null or storage_path is null;

drop index if exists chat_shared_links_active_target_url_key;

alter table public.chat_shared_links
  drop constraint if exists chat_shared_links_target_or_storage_check;

alter table public.chat_shared_links
  drop column if exists target_url;

alter table public.chat_shared_links
  alter column storage_path set not null;

commit;
