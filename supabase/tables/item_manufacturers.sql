-- Table Definition: item_manufacturers
-- Exported from Supabase on: 2025-08-05T13:14:25.974Z

CREATE TABLE public.item_manufacturers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  code character varying,
  name character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  address text
);