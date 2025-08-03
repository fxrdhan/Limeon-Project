-- Table Definition: item_packages
-- Exported from Supabase on: 2025-08-03T03:25:40.340Z

CREATE TABLE public.item_packages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(50) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  description text,
  kode character varying(50),
  nci_code character varying(50)
);