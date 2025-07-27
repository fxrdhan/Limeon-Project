-- Table Definition: item_units
-- Exported from Supabase on: 2025-07-27T11:16:32.225Z

CREATE TABLE public.item_units (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(50) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  description text
);