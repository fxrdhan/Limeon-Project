-- Table Definition: item_units
-- Exported from Supabase on: 2025-08-05T13:14:25.976Z

CREATE TABLE public.item_units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL,
  name character varying NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);