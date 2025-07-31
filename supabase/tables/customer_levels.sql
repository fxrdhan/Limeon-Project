-- Table Definition: customer_levels
-- Exported from Supabase on: 2025-07-30T03:05:46.369Z

CREATE TABLE public.customer_levels (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  level_name character varying(50) NOT NULL,
  price_percentage numeric NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);