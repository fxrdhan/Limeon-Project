-- Function: process_e_invoice_to_purchase
-- Exported from Supabase on: 2025-08-02T13:07:13.885Z

CREATE OR REPLACE FUNCTION public.process_e_invoice_to_purchase(e_invoice_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  new_purchase_id uuid;
  invoice_record record;
BEGIN
  -- Ambil data invoice
  SELECT * INTO invoice_record FROM e_invoices WHERE id = e_invoice_id;
  
  -- Buat purchase record baru
  INSERT INTO purchases (
    supplier_id,
    invoice_number,
    date,
    due_date,
    total,
    payment_status,
    vat_percentage,
    vat_amount,
    notes
  ) VALUES (
    (SELECT id FROM suppliers WHERE name = invoice_record.supplier_name LIMIT 1),
    invoice_record.invoice_number,
    invoice_record.invoice_date,
    invoice_record.due_date,
    invoice_record.total_price,
    'unpaid',
    CASE WHEN invoice_record.total_price > 0 
         THEN (invoice_record.ppn / invoice_record.total_price) * 100 
         ELSE 11.0 END,
    invoice_record.ppn,
    'Diimpor dari faktur elektronik. Diperiksa oleh: ' || invoice_record.checked_by
  ) RETURNING id INTO new_purchase_id;
  
  -- Salin item-item faktur ke purchase_items dengan konversi tanggal
  INSERT INTO purchase_items (
    purchase_id,
    item_id,
    quantity,
    price,
    subtotal,
    batch_no,
    expiry_date,
    unit
  )
  SELECT 
    new_purchase_id,
    item_id,
    quantity,
    unit_price,
    total_price,
    batch_number,
    -- Konversi format tanggal kedaluwarsa
    CASE WHEN expiry_date ~ '^\d{2}-\d{4}$' 
         THEN convert_expiry_date(expiry_date)
         ELSE NULL END,
    unit
  FROM e_invoice_items
  WHERE invoice_id = e_invoice_id;
  
  -- Update status e_invoice menjadi processed
  UPDATE e_invoices 
  SET is_processed = true, 
      related_purchase_id = new_purchase_id,
      updated_at = NOW()
  WHERE id = e_invoice_id;
  
  RETURN new_purchase_id;
END;
$function$
;