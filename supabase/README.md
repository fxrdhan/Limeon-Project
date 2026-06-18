# Supabase Source Map

Local Supabase source lives in this directory.

- Migrations: `supabase/migrations`
- Edge Functions: `supabase/functions`
- Generated frontend database types: `src/types/supabase.generated.ts`

## Operational Notes

- Treat local migration and Edge Function files as the source of truth for
  file-based changes.
- Before creating a new migration or deploying an Edge Function, compare local
  files with live Supabase state through the Supabase MCP.
- Do not make remote-only changes first. Update local files, verify Git status,
  then apply/deploy.
- After any schema change is applied to the project database, refresh generated
  frontend contracts with `bun run check:generated:fix`.
- Use `bun run check:generated` before review to verify the generated Supabase
  database types and generated Zod schemas are not stale.

## Frontend Type Source Of Truth

Database table, enum, and RPC contracts flow from Supabase into
`src/types/supabase.generated.ts`. That file is generated from the live project
schema and should not be edited manually.

Prefer deriving database-facing app types from `src/types/supabase.generated.ts`
instead of redefining table payloads in handwritten frontend types. UI-only form
state can still use local types when it has transient fields or display-specific
shape, but persistence payloads should be checked against the generated database
contract.

## Current Drift Audit

Supabase MCP audit on 2026-06-12 found historical live/local drift. The local
source tree has been reconciled to the live migration history for file-based
source control.

- Local migration filenames now match the live `version` + `name` pairs
  reported by `supabase_migrations.schema_migrations`.
- Migration `prevent_self_assigned_user_roles` was applied through Supabase MCP
  and is tracked locally as
  `migrations/20260612141924_prevent_self_assigned_user_roles.sql`.
- Migration `revoke_anon_public_table_select` was applied through Supabase MCP
  and is tracked locally as
  `migrations/20260612142708_revoke_anon_public_table_select.sql`.
  This removes direct `anon` SELECT grants from public tables; authenticated
  table access remains governed by the existing grants and RLS policies.
- Live Edge Function `chat-pdf-preview` was active remotely without local source;
  its current remote files are now tracked under
  `functions/chat-pdf-preview`.

Before adding more Supabase work, rerun the MCP comparison and keep local files
aligned with live migration/function ownership.
