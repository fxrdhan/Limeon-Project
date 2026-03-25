-- Lock function search paths to avoid role-mutable lookup resolution.

alter function public.capture_entity_history() set search_path = public;
alter function public.convert_expiry_date(text) set search_path = public;
alter function public.decrement(integer) set search_path = public;
alter function public.get_next_version_number(text, uuid) set search_path = public;
alter function public.get_top_selling_medicines(integer) set search_path = public;
alter function public.handle_updated_at() set search_path = public;
alter function public.hard_rollback_entity(text, uuid, integer) set search_path = public;
alter function public.process_e_invoice_item() set search_path = public;
alter function public.process_e_invoice_to_purchase(uuid) set search_path = public;
alter function public.process_purchase(uuid, character varying, date, numeric, character varying, character varying, text, character varying, date, numeric, boolean, jsonb) set search_path = public;
alter function public.process_purchase(uuid, character varying, date, numeric, character varying, character varying, text, date, numeric, boolean, jsonb) set search_path = public;
alter function public.restore_entity_version(text, uuid, integer) set search_path = public;
alter function public.sync_customer_from_person() set search_path = public;
alter function public.sync_patient_from_person() set search_path = public;
alter function public.sync_person_from_customer() set search_path = public;
alter function public.sync_person_from_patient() set search_path = public;
alter function public.track_item_manufacturers_changes() set search_path = public;
alter function public.update_doctors_updated_at() set search_path = public;
alter function public.update_item_units_updated_at() set search_path = public;
alter function public.update_updated_at_column() set search_path = public;
alter function public.update_user_preferences_updated_at() set search_path = public;
