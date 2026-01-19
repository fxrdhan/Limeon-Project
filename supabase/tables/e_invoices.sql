-- Table Definition: e_invoices
-- Exported from Supabase on: 2025-08-08T12:52:51.348Z

CREATE TABLE public.e_invoices (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  invoice_number character varying(50) NOT NULL,
  invoice_date date NOT NULL,
  due_date date,
  supplier_name character varying(100) NOT NULL,
  supplier_address text,
  customer_name character varying(150) NOT NULL,
  customer_address text,
  total_price numeric NOT NULL DEFAULT 0,
  ppn numeric DEFAULT 0,
  total_invoice numeric NOT NULL DEFAULT 0,
  checked_by character varying(100),
  json_data jsonb,
  is_processed boolean DEFAULT false,
  processing_notes text,
  related_purchase_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);ALTER TABLE public.e_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read e_invoices" ON public.e_invoices FOR SELECT USING (auth.role() = 'authenticated');
