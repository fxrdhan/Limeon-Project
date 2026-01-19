-- Table Definition: item_dosages
-- Exported from Supabase on: 2025-08-08T12:52:51.348Z

CREATE TABLE public.item_dosages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  code character varying,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  nci_code character varying(20)
);ALTER TABLE public.item_dosages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read item_dosages" ON public.item_dosages FOR SELECT USING (auth.role() = 'authenticated');
