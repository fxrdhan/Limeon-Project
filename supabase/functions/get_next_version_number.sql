-- Function: get_next_version_number
-- Exported from Supabase on: 2025-08-05T13:14:25.919Z

CREATE OR REPLACE FUNCTION public.get_next_version_number(p_table text, p_entity_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(version_number) + 1 
     FROM entity_history 
     WHERE entity_table = p_table AND entity_id = p_entity_id), 
    1
  );
END;
$function$
;