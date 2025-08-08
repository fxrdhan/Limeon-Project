-- Trigger: set_updated_at on table company_profiles
-- Exported from Supabase on: 2025-08-08T12:52:51.217Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.company_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();