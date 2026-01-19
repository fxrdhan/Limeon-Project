-- Table Definition: company_profiles
-- Exported from Supabase on: 2025-08-08T12:52:51.348Z

CREATE TABLE public.company_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying,
  address text NOT NULL,
  phone character varying(50),
  email character varying(100),
  website character varying(100),
  tax_id character varying(50),
  pharmacist_name character varying(100),
  pharmacist_license character varying(50),
  updated_at timestamp with time zone DEFAULT now()
);ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read company_profiles" ON public.company_profiles FOR SELECT USING (auth.role() = 'authenticated');
