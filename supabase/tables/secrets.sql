-- Table Definition: secrets
-- Exported from Supabase on: 2025-08-08T12:52:51.350Z

CREATE TABLE vault.secrets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  description text NOT NULL DEFAULT ''::text,
  secret text NOT NULL,
  key_id uuid,
  nonce bytea DEFAULT vault._crypto_aead_det_noncegen(),
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);ALTER TABLE public.secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated users to read secrets" ON public.secrets FOR SELECT USING (auth.role() = 'authenticated');
