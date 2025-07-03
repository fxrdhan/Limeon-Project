-- Trigger: set_updated_at_e_invoice_items
-- Generated on: 2025-06-24T09:24:59.454Z

CREATE TRIGGER set_updated_at_e_invoice_items BEFORE UPDATE ON public.e_invoice_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();