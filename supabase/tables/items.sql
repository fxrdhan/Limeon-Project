-- Table Definition: items
-- Exported from Supabase on: 2025-08-08T12:52:51.349Z

CREATE TABLE public.items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(100) NOT NULL,
  sell_price numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  min_stock integer DEFAULT 10,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  code character varying,
  rack character varying,
  has_expiry_date boolean DEFAULT false,
  is_medicine boolean DEFAULT true,
  category_id uuid,
  type_id uuid,
  base_unit text,
  base_price numeric DEFAULT 0,
  package_conversions jsonb DEFAULT '[]'::jsonb,
  barcode text,
  manufacturer character varying(100),
  dosage_id uuid,
  package_id uuid NOT NULL
);ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read items" ON public.items FOR SELECT USING (auth.role() = 'authenticated');
