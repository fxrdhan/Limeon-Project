-- Trigger: update_doctors_updated_at on table doctors
-- Exported from Supabase on: 2025-08-03T03:25:40.239Z

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION update_doctors_updated_at();