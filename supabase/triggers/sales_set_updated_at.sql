-- Trigger: set_updated_at on table sales
-- Exported from Supabase on: 2025-08-05T13:14:25.871Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();