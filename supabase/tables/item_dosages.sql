-- Table Definition: item_dosages
-- Exported from Supabase on: 2025-08-05T13:14:25.974Z

CREATE TABLE public.item_dosages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  code character varying,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  nci_code character varying(20)
);