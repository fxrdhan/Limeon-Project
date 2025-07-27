-- Table Definition: item_types
-- Exported from Supabase on: 2025-07-27T11:16:32.225Z

CREATE TABLE public.item_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(100) NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);