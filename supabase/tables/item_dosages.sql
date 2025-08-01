-- Table Definition: item_dosages
-- Exported from Supabase on: 2025-08-01T12:24:51.109Z

CREATE TABLE public.item_dosages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  kode character varying,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);