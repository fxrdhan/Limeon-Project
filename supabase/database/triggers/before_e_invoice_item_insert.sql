-- Trigger: before_e_invoice_item_insert
-- Generated on: 2025-06-24T09:24:59.453Z

CREATE TRIGGER before_e_invoice_item_insert BEFORE INSERT ON public.e_invoice_items FOR EACH ROW EXECUTE FUNCTION process_e_invoice_item();