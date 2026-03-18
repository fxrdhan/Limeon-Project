begin;

create table if not exists public.chat_shared_links (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  storage_path text not null,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_accessed_at timestamptz null,
  revoked_at timestamptz null,
  constraint chat_shared_links_slug_format_check
    check (slug ~ '^[23456789abcdefghjkmnpqrstuvwxyz]{10}$')
);

create unique index if not exists chat_shared_links_slug_key
  on public.chat_shared_links (slug);

create unique index if not exists chat_shared_links_active_storage_path_key
  on public.chat_shared_links (storage_path)
  where revoked_at is null;

alter table public.chat_shared_links enable row level security;

revoke all on table public.chat_shared_links from public;
revoke all on table public.chat_shared_links from anon;
revoke all on table public.chat_shared_links from authenticated;
grant all on table public.chat_shared_links to service_role;

commit;
