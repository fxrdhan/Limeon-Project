-- Trigger: set_updated_at on table sale_items
-- Exported from Supabase on: 2025-06-28T15:17:35.445Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sale_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();