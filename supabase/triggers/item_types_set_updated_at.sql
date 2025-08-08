-- Trigger: set_updated_at on table item_types
-- Exported from Supabase on: 2025-08-08T12:52:51.219Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.item_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();