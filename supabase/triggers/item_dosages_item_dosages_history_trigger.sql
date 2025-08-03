-- Trigger: item_dosages_history_trigger on table item_dosages
-- Exported from Supabase on: 2025-08-03T03:25:40.239Z

CREATE TRIGGER item_dosages_history_trigger AFTER INSERT OR DELETE OR UPDATE ON public.item_dosages FOR EACH ROW EXECUTE FUNCTION capture_entity_history();