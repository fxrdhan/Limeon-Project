-- Trigger: item_types_history_trigger on table item_types
-- Exported from Supabase on: 2025-08-08T12:52:51.220Z

CREATE TRIGGER item_types_history_trigger AFTER INSERT OR DELETE OR UPDATE ON public.item_types FOR EACH ROW EXECUTE FUNCTION capture_entity_history();