-- Function: handle_updated_at
-- Exported from Supabase on: 2025-08-02T13:07:13.881Z

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