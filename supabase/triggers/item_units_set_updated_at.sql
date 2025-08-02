-- Trigger: set_updated_at on table item_units
-- Exported from Supabase on: 2025-08-02T13:07:13.820Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.item_units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();