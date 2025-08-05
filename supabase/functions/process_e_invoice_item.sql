-- Function: process_e_invoice_item
-- Exported from Supabase on: 2025-08-05T13:14:25.920Z

CREATE OR REPLACE FUNCTION public.process_e_invoice_item()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Jika expiry_date dalam format MM-YYYY, konversi ke tanggal hari terakhir bulan
  IF NEW.expiry_date ~ '^\d{2}-\d{4}$' THEN
    -- Langsung ubah kolom expiry_date ke format tanggal PostgreSQL
    NEW.expiry_date := convert_expiry_date(NEW.expiry_date);
  END IF;
  
  RETURN NEW;
END;
$function$
;