-- Remove redundant legacy policies and make server-managed tables explicit.

drop policy if exists "Allow authenticated users to select" on public.customer_levels;
drop policy if exists "Enable all operations for authenticated users" on public.doctors;

drop policy if exists "Service role can manage gemini api logs" on public.gemini_api_logs;
create policy "Service role can manage gemini api logs"
  on public.gemini_api_logs
  for all
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
