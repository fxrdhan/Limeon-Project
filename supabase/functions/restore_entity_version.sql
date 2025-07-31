-- Function: restore_entity_version
-- Exported from Supabase on: 2025-07-30T03:05:46.281Z

CREATE OR REPLACE FUNCTION public.restore_entity_version(p_entity_table text, p_entity_id uuid, p_version_number integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_restore_data JSONB;
  v_sql TEXT;
  v_field_name TEXT;
  v_field_value TEXT;
  v_set_clause TEXT := '';
BEGIN
  -- Get the data from the specified version
  SELECT entity_data INTO v_restore_data
  FROM entity_history
  WHERE entity_table = p_entity_table 
    AND entity_id = p_entity_id 
    AND version_number = p_version_number;
  
  IF v_restore_data IS NULL THEN
    RAISE EXCEPTION 'Version % not found for entity %', p_version_number, p_entity_id;
  END IF;
  
  -- Build SET clause dynamically, excluding system fields
  FOR v_field_name IN SELECT jsonb_object_keys(v_restore_data)
  LOOP
    IF v_field_name NOT IN ('id', 'created_at') THEN
      IF v_set_clause != '' THEN
        v_set_clause := v_set_clause || ', ';
      END IF;
      
      v_field_value := v_restore_data ->> v_field_name;
      v_set_clause := v_set_clause || format('%I = %L', v_field_name, v_field_value);
    END IF;
  END LOOP;
  
  -- Add updated_at
  IF v_set_clause != '' THEN
    v_set_clause := v_set_clause || ', ';
  END IF;
  v_set_clause := v_set_clause || 'updated_at = NOW()';
  
  -- Execute the update
  v_sql := format('UPDATE %I SET %s WHERE id = %L', p_entity_table, v_set_clause, p_entity_id);
  EXECUTE v_sql;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Failed to restore version: %', SQLERRM;
END;
$function$
;