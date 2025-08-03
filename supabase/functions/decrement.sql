-- Function: decrement
-- Exported from Supabase on: 2025-08-03T03:25:40.290Z

CREATE OR REPLACE FUNCTION public.decrement(x integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN - x;
END;
$function$
;