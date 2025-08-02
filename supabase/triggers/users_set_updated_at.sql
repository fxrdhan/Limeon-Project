-- Trigger: set_updated_at on table users
-- Exported from Supabase on: 2025-08-02T13:07:13.821Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();