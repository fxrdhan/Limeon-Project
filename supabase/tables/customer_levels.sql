-- Table Definition: customer_levels
-- Exported from Supabase on: 2025-08-08T12:52:51.348Z

CREATE TABLE public.customer_levels (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  level_name character varying(50) NOT NULL,
  price_percentage numeric NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);ALTER TABLE public.customer_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read customer_levels" ON public.customer_levels FOR SELECT USING (auth.role() = 'authenticated');
