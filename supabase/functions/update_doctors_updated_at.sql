-- Function: update_doctors_updated_at
-- Exported from Supabase on: 2025-07-30T03:05:46.281Z

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