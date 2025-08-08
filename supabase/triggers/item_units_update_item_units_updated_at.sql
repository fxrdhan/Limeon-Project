-- Trigger: update_item_units_updated_at on table item_units
-- Exported from Supabase on: 2025-08-08T12:52:51.220Z

CREATE TRIGGER update_item_units_updated_at BEFORE UPDATE ON public.item_units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();