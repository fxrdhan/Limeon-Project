-- Table Definition: item_categories
-- Exported from Supabase on: 2025-06-28T15:17:35.514Z

CREATE TABLE public.item_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(100) NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);