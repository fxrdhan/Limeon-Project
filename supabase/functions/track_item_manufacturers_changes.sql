-- Function: track_item_manufacturers_changes
-- Exported from Supabase on: 2025-08-02T13:07:13.882Z

CREATE OR REPLACE FUNCTION public.track_item_manufacturers_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    current_version integer;
    current_user_id uuid;
BEGIN
    -- Get current user ID (if available)
    current_user_id := auth.uid();
    
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 
    INTO current_version
    FROM public.entity_history 
    WHERE entity_table = 'item_manufacturers' 
    AND entity_id = COALESCE(NEW.id, OLD.id);
    
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.entity_history (
            entity_table,
            entity_id,
            version_number,
            action_type,
            changed_by,
            changed_at,
            entity_data,
            changed_fields,
            change_description
        ) VALUES (
            'item_manufacturers',
            NEW.id,
            current_version,
            'INSERT',
            current_user_id,
            now(),
            to_jsonb(NEW),
            NULL,
            'Created new manufacturer: ' || NEW.name
        );
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only track if there are actual changes (updated to use address instead of description)
        IF OLD.name != NEW.name OR 
           COALESCE(OLD.kode, '') != COALESCE(NEW.kode, '') OR 
           COALESCE(OLD.address, '') != COALESCE(NEW.address, '') THEN
            
            INSERT INTO public.entity_history (
                entity_table,
                entity_id,
                version_number,
                action_type,
                changed_by,
                changed_at,
                entity_data,
                changed_fields,
                change_description
            ) VALUES (
                'item_manufacturers',
                NEW.id,
                current_version,
                'UPDATE',
                current_user_id,
                now(),
                to_jsonb(NEW),
                jsonb_build_object(
                    'name', jsonb_build_object('old', OLD.name, 'new', NEW.name),
                    'kode', jsonb_build_object('old', OLD.kode, 'new', NEW.kode),
                    'address', jsonb_build_object('old', OLD.address, 'new', NEW.address)
                ),
                'Updated manufacturer: ' || NEW.name
            );
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.entity_history (
            entity_table,
            entity_id,
            version_number,
            action_type,
            changed_by,
            changed_at,
            entity_data,
            changed_fields,
            change_description
        ) VALUES (
            'item_manufacturers',
            OLD.id,
            current_version,
            'DELETE',
            current_user_id,
            now(),
            to_jsonb(OLD),
            NULL,
            'Deleted manufacturer: ' || OLD.name
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$function$
;