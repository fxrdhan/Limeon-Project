-- Table Definition: purchases
-- Exported from Supabase on: 2025-08-08T12:52:51.349Z

CREATE TABLE public.purchases (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  supplier_id uuid,
  invoice_number character varying(50),
  date date NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  payment_status character varying(20) DEFAULT 'unpaid'::character varying,
  payment_method character varying(20),
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  so_number character varying(50),
  due_date date,
  vat_amount numeric DEFAULT 0,
  vat_percentage numeric DEFAULT 11.0,
  is_vat_included boolean DEFAULT true,
  customer_name character varying(150),
  customer_address text
);ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read purchases" ON public.purchases FOR SELECT USING (auth.role() = 'authenticated');
