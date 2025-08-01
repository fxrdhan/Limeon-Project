-- Function: decrement
-- Exported from Supabase on: 2025-08-01T17:43:16.370Z

CREATE OR REPLACE FUNCTION public.decrement(x integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN - x;
END;
$function$
;