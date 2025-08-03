-- Table Definition: suppliers
-- Exported from Supabase on: 2025-08-03T03:25:40.342Z

CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(100) NOT NULL,
  address text,
  phone character varying(20),
  email character varying(100),
  contact_person character varying(100),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  image_url text
);