-- Table Definition: item_types
-- Exported from Supabase on: 2025-08-01T17:43:16.435Z

CREATE TABLE public.item_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(100) NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  kode character varying(50)
);