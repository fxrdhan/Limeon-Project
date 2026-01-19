-- Table Definition: e_invoice_items
-- Exported from Supabase on: 2025-08-08T12:52:51.348Z

CREATE TABLE public.e_invoice_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  invoice_id uuid,
  sku character varying(50),
  product_name character varying(200) NOT NULL,
  quantity integer NOT NULL,
  unit character varying(20),
  batch_number character varying(50),
  expiry_date character varying(10),
  unit_price numeric NOT NULL,
  discount numeric DEFAULT 0,
  total_price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  unit_id uuid,
  item_id uuid
);ALTER TABLE public.e_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read e_invoice_items" ON public.e_invoice_items FOR SELECT USING (auth.role() = 'authenticated');
