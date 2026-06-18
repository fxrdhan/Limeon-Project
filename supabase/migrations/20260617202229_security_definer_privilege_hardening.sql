begin;

revoke all on function public.capture_entity_history() from public;
revoke all on function public.capture_entity_history() from anon;
revoke all on function public.capture_entity_history() from authenticated;

revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon;
revoke all on function public.handle_new_user() from authenticated;

revoke all on function public.restore_entity_version(text, uuid, integer) from public;
revoke all on function public.restore_entity_version(text, uuid, integer) from anon;
revoke all on function public.restore_entity_version(text, uuid, integer) from authenticated;
grant execute on function public.restore_entity_version(text, uuid, integer) to service_role;

revoke all on function public.mark_chat_messages_as_delivered(uuid, uuid, text) from public;
revoke all on function public.mark_chat_messages_as_delivered(uuid, uuid, text) from anon;
grant execute on function public.mark_chat_messages_as_delivered(uuid, uuid, text) to authenticated;
grant execute on function public.mark_chat_messages_as_delivered(uuid, uuid, text) to service_role;

revoke all on function public.mark_chat_messages_as_read(uuid, uuid, text) from public;
revoke all on function public.mark_chat_messages_as_read(uuid, uuid, text) from anon;
grant execute on function public.mark_chat_messages_as_read(uuid, uuid, text) to authenticated;
grant execute on function public.mark_chat_messages_as_read(uuid, uuid, text) to service_role;

create or replace function public.hard_rollback_entity(
  p_entity_table text,
  p_entity_id uuid,
  p_target_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_target_version record;
  v_deleted_count integer;
  v_max_version integer;
  v_restore_data jsonb;
  v_sql text;
  v_field_name text;
  v_set_clause text := '';
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.current_user_is_admin() then
    raise exception 'Forbidden';
  end if;

  if p_entity_table is null or p_entity_id is null or p_target_version is null then
    raise exception 'All parameters are required';
  end if;

  if p_entity_table not in (
    'items',
    'item_categories',
    'item_types',
    'item_packages',
    'item_dosages',
    'item_manufacturers',
    'item_units'
  ) then
    raise exception 'Unsupported rollback table %', p_entity_table;
  end if;

  select *
  into v_target_version
  from public.entity_history
  where entity_table = p_entity_table
    and entity_id = p_entity_id
    and version_number = p_target_version;

  if v_target_version is null then
    raise exception
      'Target version % not found for entity % in table %',
      p_target_version,
      p_entity_id,
      p_entity_table;
  end if;

  select max(version_number)
  into v_max_version
  from public.entity_history
  where entity_table = p_entity_table
    and entity_id = p_entity_id;

  v_restore_data := v_target_version.entity_data;

  for v_field_name in select jsonb_object_keys(v_restore_data)
  loop
    if v_field_name not in ('id', 'created_at', 'updated_at') then
      if v_set_clause <> '' then
        v_set_clause := v_set_clause || ', ';
      end if;

      v_set_clause := v_set_clause || format(
        '%I = %L',
        v_field_name,
        v_restore_data ->> v_field_name
      );
    end if;
  end loop;

  if v_set_clause <> '' then
    v_set_clause := v_set_clause || ', ';
  end if;

  v_set_clause := v_set_clause || format(
    'updated_at = %L',
    v_target_version.changed_at
  );

  v_sql := format(
    'update public.%I set %s where id = %L',
    p_entity_table,
    v_set_clause,
    p_entity_id
  );
  execute v_sql;

  delete from public.entity_history
  where entity_table = p_entity_table
    and entity_id = p_entity_id
    and version_number > p_target_version;

  get diagnostics v_deleted_count = row_count;

  return jsonb_build_object(
    'success', true,
    'deleted_count', v_deleted_count,
    'target_version', p_target_version,
    'previous_max_version', v_max_version,
    'entity_restored', true
  );
end;
$function$;

revoke all on function public.hard_rollback_entity(text, uuid, integer) from public;
revoke all on function public.hard_rollback_entity(text, uuid, integer) from anon;
grant execute on function public.hard_rollback_entity(text, uuid, integer) to authenticated;
grant execute on function public.hard_rollback_entity(text, uuid, integer) to service_role;

commit;
