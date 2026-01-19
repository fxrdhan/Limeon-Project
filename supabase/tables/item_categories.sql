-- Table Definition: item_categories
-- Exported from Supabase on: 2025-08-08T12:52:51.348Z

CREATE TABLE public.item_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(100) NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  code character varying(50)
);ALTER TABLE public.item_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read item_categories" ON public.item_categories FOR SELECT USING (auth.role() = 'authenticated');
