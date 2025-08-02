-- Trigger: handle_item_manufacturers_updated_at on table item_manufacturers
-- Exported from Supabase on: 2025-08-02T13:07:13.823Z

CREATE TRIGGER handle_item_manufacturers_updated_at BEFORE UPDATE ON public.item_manufacturers FOR EACH ROW EXECUTE FUNCTION handle_updated_at();