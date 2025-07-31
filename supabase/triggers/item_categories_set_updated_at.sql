-- Trigger: set_updated_at on table item_categories
-- Exported from Supabase on: 2025-07-30T03:05:46.154Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.item_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();