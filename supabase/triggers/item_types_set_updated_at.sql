-- Trigger: set_updated_at on table item_types
-- Exported from Supabase on: 2025-07-30T03:05:46.155Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.item_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();