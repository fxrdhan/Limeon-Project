-- Function: hard_rollback_entity
-- Purpose: Performs a destructive rollback by deleting all versions after the target version
--          AND restores the entity data to the target version state
-- This is irreversible and should be used with caution

CREATE OR REPLACE FUNCTION public.hard_rollback_entity(
  p_entity_table TEXT,
  p_entity_id UUID,
  p_target_version INTEGER
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target_version RECORD;
  v_deleted_count INTEGER;
  v_max_version INTEGER;
  v_restore_data JSONB;
  v_sql TEXT;
  v_field_name TEXT;
  v_set_clause TEXT := '';
BEGIN
  -- Validate inputs
  IF p_entity_table IS NULL OR p_entity_id IS NULL OR p_target_version IS NULL THEN
    RAISE EXCEPTION 'All parameters are required';
  END IF;

  -- Fetch target version to verify it exists
  SELECT * INTO v_target_version
  FROM public.entity_history
  WHERE entity_table = p_entity_table
    AND entity_id = p_entity_id
    AND version_number = p_target_version;

  IF v_target_version IS NULL THEN
    RAISE EXCEPTION 'Target version % not found for entity % in table %',
      p_target_version, p_entity_id, p_entity_table;
  END IF;

  -- Get current max version for logging
  SELECT MAX(version_number) INTO v_max_version
  FROM public.entity_history
  WHERE entity_table = p_entity_table
    AND entity_id = p_entity_id;

  -- Get the entity data from the target version for restoration
  v_restore_data := v_target_version.entity_data;

  -- Build SET clause dynamically, excluding system fields
  FOR v_field_name IN SELECT jsonb_object_keys(v_restore_data)
  LOOP
    IF v_field_name NOT IN ('id', 'created_at', 'updated_at') THEN
      IF v_set_clause != '' THEN
        v_set_clause := v_set_clause || ', ';
      END IF;
      v_set_clause := v_set_clause || format('%I = %L', v_field_name, v_restore_data ->> v_field_name);
    END IF;
  END LOOP;

  -- Add updated_at to match the target version timestamp
  IF v_set_clause != '' THEN
    v_set_clause := v_set_clause || ', ';
  END IF;
  v_set_clause := v_set_clause || format('updated_at = %L', v_target_version.changed_at);

  -- STEP 1: Update entity data first (this will trigger a new version creation)
  v_sql := format('UPDATE %I SET %s WHERE id = %L', p_entity_table, v_set_clause, p_entity_id);
  EXECUTE v_sql;

  -- STEP 2: Delete ALL versions after target version
  -- This includes the version just created by the UPDATE above
  DELETE FROM public.entity_history
  WHERE entity_table = p_entity_table
    AND entity_id = p_entity_id
    AND version_number > p_target_version;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Log the operation
  RAISE NOTICE 'Hard rollback: restored entity data to v% and deleted % versions (v% to v%) for entity % in table %',
    p_target_version, v_deleted_count, p_target_version + 1, v_max_version, p_entity_id, p_entity_table;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'target_version', p_target_version,
    'previous_max_version', v_max_version,
    'entity_restored', true
  );
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.hard_rollback_entity IS
  'Performs a hard rollback by restoring entity data to the target version, then deleting all history versions after it. This is irreversible.';
