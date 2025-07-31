-- Trigger: set_updated_at on table customer_level_discounts
-- Exported from Supabase on: 2025-07-30T03:05:46.151Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customer_level_discounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();