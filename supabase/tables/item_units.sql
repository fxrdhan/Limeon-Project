-- Table Definition: item_units
-- Exported from Supabase on: 2025-08-01T12:24:51.109Z

CREATE TABLE public.item_units (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(50) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  description text,
  kode character varying(50)
);