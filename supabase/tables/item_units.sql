-- Table Definition: item_units
-- Exported from Supabase on: 2025-08-08T12:52:51.349Z

CREATE TABLE public.item_units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code character varying NOT NULL,
  name character varying NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);ALTER TABLE public.item_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read item_units" ON public.item_units FOR SELECT USING (auth.role() = 'authenticated');
