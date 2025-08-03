-- Table Definition: customers
-- Exported from Supabase on: 2025-08-03T03:25:40.338Z

CREATE TABLE public.customers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(100) NOT NULL,
  email character varying(100),
  phone character varying(20),
  address text,
  customer_level_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);