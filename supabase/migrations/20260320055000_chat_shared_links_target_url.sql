begin;

alter table public.chat_shared_links
  add column if not exists target_url text;

alter table public.chat_shared_links
  alter column storage_path drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_shared_links_target_or_storage_check'
  ) then
    alter table public.chat_shared_links
      add constraint chat_shared_links_target_or_storage_check
      check ((storage_path is null) <> (target_url is null));
  end if;
end $$;

create unique index if not exists chat_shared_links_active_target_url_key
  on public.chat_shared_links (target_url)
  where revoked_at is null and target_url is not null;

commit;
