-- Table Definition: doctors
-- Exported from Supabase on: 2025-08-08T12:52:51.348Z

CREATE TABLE public.doctors (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying(100) NOT NULL,
  specialization character varying(100),
  license_number character varying(50),
  phone character varying(20),
  email character varying(100),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  gender character varying(10),
  address text,
  birth_date date,
  experience_years integer,
  qualification text,
  image_url text
);ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read doctors" ON public.doctors FOR SELECT USING (auth.role() = 'authenticated');
