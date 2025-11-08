-- Table Definition: entity_history
-- Exported from Supabase on: 2025-08-08T12:52:51.348Z

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
  change_description text,
  CONSTRAINT entity_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL
);