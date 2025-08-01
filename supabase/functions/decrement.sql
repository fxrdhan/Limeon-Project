-- Function: decrement
-- Exported from Supabase on: 2025-08-01T12:24:51.033Z

CREATE OR REPLACE FUNCTION public.decrement(x integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN - x;
END;
$function$
;