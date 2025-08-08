-- Function: update_updated_at_column
-- Exported from Supabase on: 2025-08-08T12:52:51.283Z

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