-- Trigger: set_updated_at_e_invoice on table e_invoices
-- Exported from Supabase on: 2025-07-27T11:16:31.991Z

CREATE TRIGGER set_updated_at_e_invoice BEFORE UPDATE ON public.e_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();