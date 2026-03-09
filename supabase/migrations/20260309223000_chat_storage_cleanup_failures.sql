begin;

create table if not exists public.chat_storage_cleanup_failures (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references public.users (id) on delete cascade,
  message_id uuid,
  failure_stage text not null,
  storage_paths text[] not null default '{}'::text[],
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chat_storage_cleanup_failures_failure_stage_check'
  ) then
    alter table public.chat_storage_cleanup_failures
      add constraint chat_storage_cleanup_failures_failure_stage_check
      check (failure_stage in ('delete_thread', 'cleanup_storage'));
  end if;
end
$$;

create index if not exists idx_chat_storage_cleanup_failures_requested_by
  on public.chat_storage_cleanup_failures (requested_by, created_at desc);

create index if not exists idx_chat_storage_cleanup_failures_unresolved
  on public.chat_storage_cleanup_failures (resolved_at, created_at desc)
  where resolved_at is null;

alter table public.chat_storage_cleanup_failures enable row level security;

drop policy if exists "Users can view their own chat cleanup failures"
on public.chat_storage_cleanup_failures;
create policy "Users can view their own chat cleanup failures"
  on public.chat_storage_cleanup_failures
  for select
  to authenticated
  using (requested_by = auth.uid());

commit;
