-- Function: decrement
-- Exported from Supabase on: 2025-08-08T12:52:51.283Z

CREATE OR REPLACE FUNCTION public.decrement(x integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN - x;
END;
$function$
;