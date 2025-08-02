-- Trigger: item_dosages_history_trigger on table item_dosages
-- Exported from Supabase on: 2025-08-02T13:07:13.823Z

CREATE TRIGGER item_dosages_history_trigger AFTER INSERT OR DELETE OR UPDATE ON public.item_dosages FOR EACH ROW EXECUTE FUNCTION capture_entity_history();