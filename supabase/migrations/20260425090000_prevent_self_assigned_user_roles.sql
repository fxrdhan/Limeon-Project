begin;

revoke insert, update on table public.users from public, anon, authenticated;
grant insert (
  id,
  name,
  email,
  profilephoto,
  profilephoto_thumb,
  profilephoto_path
) on table public.users to authenticated;
grant update (
  name,
  email,
  profilephoto,
  profilephoto_thumb,
  profilephoto_path,
  updated_at
) on table public.users to authenticated;
grant insert, update on table public.users to service_role;

create or replace function public.prevent_self_assigned_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if (select auth.role()) = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if (select auth.uid()) = new.id and coalesce(new.role, 'user') <> 'user' then
      raise exception 'Users cannot self-assign privileged roles'
        using errcode = '42501';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if (select auth.uid()) = new.id and new.role is distinct from old.role then
      raise exception 'Users cannot change their own role'
        using errcode = '42501';
    end if;

    return new;
  end if;

  return new;
end;
$function$;

revoke all on function public.prevent_self_assigned_user_role() from public;
revoke all on function public.prevent_self_assigned_user_role() from anon;
revoke all on function public.prevent_self_assigned_user_role() from authenticated;

drop trigger if exists prevent_self_assigned_user_role on public.users;
create trigger prevent_self_assigned_user_role
  before insert or update of role on public.users
  for each row
  execute function public.prevent_self_assigned_user_role();

commit;
