-- Table Definition: sale_items
-- Exported from Supabase on: 2025-08-08T12:52:51.349Z

CREATE TABLE public.sale_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  sale_id uuid,
  item_id uuid,
  quantity integer NOT NULL,
  price numeric NOT NULL,
  subtotal numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read sale_items" ON public.sale_items FOR SELECT USING (auth.role() = 'authenticated');
