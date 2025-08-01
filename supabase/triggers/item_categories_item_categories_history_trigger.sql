-- Trigger: item_categories_history_trigger on table item_categories
-- Exported from Supabase on: 2025-08-01T17:43:16.261Z

CREATE TRIGGER item_categories_history_trigger AFTER INSERT OR DELETE OR UPDATE ON public.item_categories FOR EACH ROW EXECUTE FUNCTION capture_entity_history();