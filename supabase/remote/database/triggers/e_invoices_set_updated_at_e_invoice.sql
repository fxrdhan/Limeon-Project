-- Trigger: set_updated_at_e_invoice on table e_invoices
-- Exported from Supabase on: 2025-06-28T15:17:35.445Z

CREATE TRIGGER set_updated_at_e_invoice BEFORE UPDATE ON public.e_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();