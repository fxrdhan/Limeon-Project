-- Function: update_updated_at_column
-- Exported from Supabase on: 2025-07-27T11:16:32.139Z

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