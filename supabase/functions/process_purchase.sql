-- Function: process_purchase
-- Exported from Supabase on: 2025-08-08T12:52:51.283Z

CREATE OR REPLACE FUNCTION public.process_purchase(p_supplier_id uuid, p_invoice_number character varying, p_date date, p_total numeric, p_payment_status character varying, p_payment_method character varying, p_notes text, p_so_number character varying, p_due_date date, p_vat_amount numeric, p_is_vat_included boolean, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  purchase_id UUID;
BEGIN
  -- Insert purchase record
  INSERT INTO purchases (
    supplier_id, invoice_number, date, total, payment_status, payment_method, 
    notes, so_number, due_date, vat_amount, is_vat_included, created_at
  ) VALUES (
    p_supplier_id, p_invoice_number, p_date, p_total, p_payment_status, p_payment_method, 
    p_notes, p_so_number, p_due_date, p_vat_amount, p_is_vat_included, NOW()
  ) RETURNING id INTO purchase_id;
  
  -- Process items with batch info
  FOR i IN 0..jsonb_array_length(p_items) - 1 LOOP
    INSERT INTO purchase_items (
      purchase_id, medicine_id, quantity, price, subtotal, 
      batch_no, expiry_date, unit, created_at
    ) VALUES (
      purchase_id,
      (p_items->i->>'item_id')::UUID,
      (p_items->i->>'quantity')::INTEGER,
      (p_items->i->>'price')::NUMERIC,
      (p_items->i->>'subtotal')::NUMERIC,
      p_items->i->>'batch_no',
      (p_items->i->>'expiry_date')::DATE,
      p_items->i->>'unit',
      NOW()
    );
  END LOOP;
  
  RETURN purchase_id;
END;
$function$
;