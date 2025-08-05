-- Function: handle_updated_at
-- Exported from Supabase on: 2025-08-05T13:14:25.919Z

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
  BEGIN
      NEW.updated_at = now();
      RETURN NEW;
  END;
  $function$
;