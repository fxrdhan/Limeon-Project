-- Trigger: set_updated_at on table purchase_items
-- Exported from Supabase on: 2025-08-01T12:24:50.936Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.purchase_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();