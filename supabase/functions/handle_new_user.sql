-- Function: handle_new_user
-- Exported from Supabase on: 2025-06-28T15:17:35.472Z

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.users (id, email, name, role) -- Sesuaikan kolom jika perlu
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), -- Ambil nama jika ada, atau gunakan bagian email
    'staff' -- Atur peran default, sesuaikan jika perlu
   );
  return new;
end;
$function$
;