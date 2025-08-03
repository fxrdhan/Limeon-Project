-- Function: update_doctors_updated_at
-- Exported from Supabase on: 2025-08-03T03:25:40.290Z

CREATE OR REPLACE FUNCTION public.update_doctors_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;