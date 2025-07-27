-- Trigger: set_updated_at on table users
-- Exported from Supabase on: 2025-07-27T11:16:31.991Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();