-- Trigger: set_updated_at on table customer_level_discounts
-- Exported from Supabase on: 2025-06-28T15:17:35.444Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customer_level_discounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();