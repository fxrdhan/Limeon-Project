create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.users user_row
    where user_row.id = auth.uid()
      and lower(coalesce(user_row.role, '')) in ('admin', 'owner', 'super_admin')
  );
$function$;

revoke all on function public.current_user_is_admin() from public;
revoke all on function public.current_user_is_admin() from anon;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.current_user_is_admin() to service_role;
