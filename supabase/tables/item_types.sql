-- Table Definition: item_types
-- Exported from Supabase on: 2025-08-05T13:14:25.975Z

CREATE TABLE public.item_types (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(100) NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  code character varying(50)
);