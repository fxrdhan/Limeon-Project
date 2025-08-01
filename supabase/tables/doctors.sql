-- Table Definition: doctors
-- Exported from Supabase on: 2025-08-01T12:24:51.109Z

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
);