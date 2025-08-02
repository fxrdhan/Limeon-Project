-- Trigger: set_updated_at on table customer_levels
-- Exported from Supabase on: 2025-08-02T13:07:13.818Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customer_levels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();