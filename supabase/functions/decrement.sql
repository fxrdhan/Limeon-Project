-- Function: decrement
-- Exported from Supabase on: 2025-07-27T11:16:32.138Z

CREATE OR REPLACE FUNCTION public.decrement(x integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN - x;
END;
$function$
;