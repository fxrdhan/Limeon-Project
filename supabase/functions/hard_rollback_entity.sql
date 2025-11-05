-- Function: hard_rollback_entity
-- Purpose: Performs a destructive rollback by deleting all versions after the target version
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

  -- Delete all versions after target version
  -- This is the destructive part - versions are permanently removed
  DELETE FROM public.entity_history
  WHERE entity_table = p_entity_table
    AND entity_id = p_entity_id
    AND version_number > p_target_version;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Log the operation
  RAISE NOTICE 'Hard rollback: deleted % versions (v% to v%) for entity % in table %',
    v_deleted_count, p_target_version + 1, v_max_version, p_entity_id, p_entity_table;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'target_version', p_target_version,
    'previous_max_version', v_max_version
  );
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.hard_rollback_entity IS
  'Performs a hard rollback by deleting all history versions after the target version. This is irreversible.';
