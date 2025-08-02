-- Function: capture_entity_history
-- Exported from Supabase on: 2025-08-02T13:07:13.880Z

CREATE OR REPLACE FUNCTION public.capture_entity_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_version_number INTEGER;
  v_changed_fields JSONB := '{}';
  v_field_record RECORD;
  v_current_user_id UUID;
BEGIN
  -- Get current user (with fallback)
  BEGIN
    v_current_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_current_user_id := NULL;
  END;

  -- Get next version number
  v_version_number := get_next_version_number(TG_TABLE_NAME, 
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id 
      ELSE NEW.id 
    END
  );
  
  -- For UPDATE, calculate changed fields with detailed comparison
  IF TG_OP = 'UPDATE' THEN
    -- Compare each field dynamically
    FOR v_field_record IN 
      SELECT key as field_name,
             to_jsonb(OLD) ->> key as old_value,
             to_jsonb(NEW) ->> key as new_value
      FROM jsonb_object_keys(to_jsonb(NEW)) key
    LOOP
      -- Only track changes for non-system fields
      IF v_field_record.field_name NOT IN ('updated_at', 'created_at') AND 
         v_field_record.old_value IS DISTINCT FROM v_field_record.new_value THEN
        
        v_changed_fields := v_changed_fields || 
          jsonb_build_object(
            v_field_record.field_name, 
            jsonb_build_object(
              'from', v_field_record.old_value, 
              'to', v_field_record.new_value
            )
          );
      END IF;
    END LOOP;
    
    -- Skip if no meaningful changes (only timestamps changed)
    IF v_changed_fields = '{}' THEN
      RETURN NEW;
    END IF;
  END IF;
  
  -- Insert history record
  INSERT INTO entity_history (
    entity_table,
    entity_id,
    version_number,
    action_type,
    changed_by,
    entity_data,
    changed_fields
  ) VALUES (
    TG_TABLE_NAME,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id 
      ELSE NEW.id 
    END,
    v_version_number,
    TG_OP,
    v_current_user_id,
    CASE 
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      ELSE to_jsonb(NEW)
    END,
    CASE WHEN TG_OP = 'UPDATE' THEN v_changed_fields ELSE NULL END
  );
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$
;