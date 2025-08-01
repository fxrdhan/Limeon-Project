-- Trigger: set_updated_at_e_invoice on table e_invoices
-- Exported from Supabase on: 2025-08-01T17:43:16.259Z

CREATE TRIGGER set_updated_at_e_invoice BEFORE UPDATE ON public.e_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();