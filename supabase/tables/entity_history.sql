-- Table Definition: entity_history
-- Exported from Supabase on: 2025-07-30T03:05:46.370Z

CREATE TABLE public.entity_history (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  entity_table text NOT NULL,
  entity_id uuid NOT NULL,
  version_number integer NOT NULL,
  action_type text NOT NULL,
  changed_by uuid,
  changed_at timestamp with time zone DEFAULT now(),
  entity_data jsonb NOT NULL,
  changed_fields jsonb,
  change_description text
);