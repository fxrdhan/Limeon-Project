-- Trigger: item_units_history_trigger on table item_units
-- Exported from Supabase on: 2025-08-01T12:24:50.937Z

CREATE TRIGGER item_units_history_trigger AFTER INSERT OR DELETE OR UPDATE ON public.item_units FOR EACH ROW EXECUTE FUNCTION capture_entity_history();