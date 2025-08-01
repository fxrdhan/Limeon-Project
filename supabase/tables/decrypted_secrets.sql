-- Table Definition: decrypted_secrets
-- Exported from Supabase on: 2025-08-01T17:43:16.437Z

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
);