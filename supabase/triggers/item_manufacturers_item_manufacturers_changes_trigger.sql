-- Trigger: item_manufacturers_changes_trigger on table item_manufacturers
-- Exported from Supabase on: 2025-08-03T03:25:40.240Z

CREATE TRIGGER item_manufacturers_changes_trigger AFTER INSERT OR DELETE OR UPDATE ON public.item_manufacturers FOR EACH ROW EXECUTE FUNCTION track_item_manufacturers_changes();