-- Table Definition: item_packages
-- Exported from Supabase on: 2025-08-08T12:52:51.349Z

CREATE TABLE public.item_packages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(50) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  description text,
  code character varying(50),
  nci_code character varying(50)
);ALTER TABLE public.item_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read item_packages" ON public.item_packages FOR SELECT USING (auth.role() = 'authenticated');
