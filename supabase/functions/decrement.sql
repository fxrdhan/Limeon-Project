-- Function: decrement
-- Exported from Supabase on: 2025-07-30T03:05:46.282Z

CREATE OR REPLACE FUNCTION public.decrement(x integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN - x;
END;
$function$
;