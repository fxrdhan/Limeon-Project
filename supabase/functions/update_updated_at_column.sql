-- Function: update_updated_at_column
-- Exported from Supabase on: 2025-06-28T15:17:35.472Z

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$function$
;