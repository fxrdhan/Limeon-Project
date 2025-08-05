-- Trigger: update_item_dosages_updated_at on table item_dosages
-- Exported from Supabase on: 2025-08-05T13:14:25.872Z

CREATE TRIGGER update_item_dosages_updated_at BEFORE UPDATE ON public.item_dosages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();