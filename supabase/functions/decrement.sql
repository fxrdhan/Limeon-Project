-- Function: decrement
-- Exported from Supabase on: 2025-08-05T13:14:25.920Z

CREATE OR REPLACE FUNCTION public.decrement(x integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN - x;
END;
$function$
;