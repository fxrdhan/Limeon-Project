-- Trigger: set_updated_at on table patients
-- Exported from Supabase on: 2025-08-08T12:52:51.220Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();