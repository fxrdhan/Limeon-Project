-- Trigger: set_updated_at_e_invoice_items on table e_invoice_items
-- Exported from Supabase on: 2025-07-30T03:05:46.155Z

CREATE TRIGGER set_updated_at_e_invoice_items BEFORE UPDATE ON public.e_invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();