-- Table Definition: customers
-- Exported from Supabase on: 2025-08-08T12:52:51.348Z

CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(100) NOT NULL,
  email character varying(100),
  phone character varying(20),
  address text,
  customer_level_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read customers" ON public.customers FOR SELECT USING (auth.role() = 'authenticated');
