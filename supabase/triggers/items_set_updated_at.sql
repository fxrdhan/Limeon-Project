-- Trigger: set_updated_at on table items
-- Exported from Supabase on: 2025-08-01T17:43:16.260Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();