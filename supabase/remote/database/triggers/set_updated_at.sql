-- Trigger: set_updated_at
-- Generated on: 2025-06-24T09:24:59.455Z

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();