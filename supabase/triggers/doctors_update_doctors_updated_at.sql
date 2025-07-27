-- Trigger: update_doctors_updated_at on table doctors
-- Exported from Supabase on: 2025-07-27T11:16:31.991Z

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION update_doctors_updated_at();