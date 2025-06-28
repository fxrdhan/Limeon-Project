-- Trigger: set_updated_at_e_invoice_items on table e_invoice_items
-- Exported from Supabase on: 2025-06-28T15:17:35.445Z

CREATE TRIGGER set_updated_at_e_invoice_items BEFORE UPDATE ON public.e_invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();