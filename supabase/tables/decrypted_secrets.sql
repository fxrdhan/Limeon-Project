-- Table Definition: decrypted_secrets
-- Exported from Supabase on: 2025-08-08T12:52:51.350Z

CREATE TABLE vault.decrypted_secrets (
  id uuid,
  name text,
  description text,
  secret text,
  decrypted_secret text,
  key_id uuid,
  nonce bytea,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
);ALTER TABLE public.decrypted_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read decrypted_secrets" ON public.decrypted_secrets FOR SELECT USING (auth.role() = 'authenticated');
