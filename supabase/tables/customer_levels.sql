-- Table Definition: customer_levels
-- Exported from Supabase on: 2025-08-05T13:14:25.968Z

CREATE TABLE public.customer_levels (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  level_name character varying(50) NOT NULL,
  price_percentage numeric NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);