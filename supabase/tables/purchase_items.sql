-- Table Definition: purchase_items
-- Exported from Supabase on: 2025-08-08T12:52:51.349Z

CREATE TABLE public.purchase_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  purchase_id uuid,
  item_id uuid,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  batch_no character varying(50),
  expiry_date date,
  unit character varying(50),
  discount numeric DEFAULT 0,
  vat_percentage numeric DEFAULT 0
);ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read purchase_items" ON public.purchase_items FOR SELECT USING (auth.role() = 'authenticated');
