-- Table Definition: item_manufacturers
-- Exported from Supabase on: 2025-08-03T03:25:40.340Z

CREATE TABLE public.item_manufacturers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  kode character varying,
  name character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  address text
);