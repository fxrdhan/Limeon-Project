-- Trigger: update_doctors_updated_at on table doctors
-- Exported from Supabase on: 2025-08-05T13:14:25.872Z

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION update_doctors_updated_at();