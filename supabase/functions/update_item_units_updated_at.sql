-- Function: update_item_units_updated_at
-- Exported from Supabase on: 2025-08-08T12:52:51.282Z

CREATE OR REPLACE FUNCTION public.update_item_units_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;