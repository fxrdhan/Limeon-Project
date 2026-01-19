-- Table Definition: users
-- Exported from Supabase on: 2025-08-08T12:52:51.350Z

CREATE TABLE public.users (
  id uuid NOT NULL,
  name character varying(100) NOT NULL,
  email character varying(100) NOT NULL,
  role character varying(20) NOT NULL DEFAULT 'staff'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  profilephoto text,
  profilephoto_path text
);ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read users" ON public.users FOR SELECT USING (auth.role() = 'authenticated');
