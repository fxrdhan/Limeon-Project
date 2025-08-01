-- Trigger: set_updated_at on table customers
-- Exported from Supabase on: 2025-08-01T12:24:50.934Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();