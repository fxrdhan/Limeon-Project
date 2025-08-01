-- Trigger: before_e_invoice_item_insert on table e_invoice_items
-- Exported from Supabase on: 2025-08-01T17:43:16.259Z

CREATE TRIGGER before_e_invoice_item_insert BEFORE INSERT ON public.e_invoice_items FOR EACH ROW EXECUTE FUNCTION process_e_invoice_item();