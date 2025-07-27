-- Trigger: items_history_trigger on table items
-- Exported from Supabase on: 2025-07-27T11:16:31.991Z

CREATE TRIGGER items_history_trigger AFTER INSERT OR DELETE OR UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION capture_entity_history();