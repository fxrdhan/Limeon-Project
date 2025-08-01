-- Function: get_top_selling_medicines
-- Exported from Supabase on: 2025-08-01T12:24:51.033Z

CREATE OR REPLACE FUNCTION public.get_top_selling_medicines(limit_count integer)
 RETURNS TABLE(name character varying, total_quantity bigint)
 LANGUAGE plpgsql
AS $function$BEGIN
    RETURN QUERY
    SELECT m.name, SUM(si.quantity) as total_quantity
    FROM items m
    JOIN sale_items si ON m.id = si.item_id
    GROUP BY m.name
    ORDER BY total_quantity DESC
    LIMIT limit_count;
END;$function$
;