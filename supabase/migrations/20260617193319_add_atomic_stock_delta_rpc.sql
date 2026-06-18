begin;

create or replace function public.apply_item_stock_deltas(
  p_updates jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_missing_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_updates is null or jsonb_typeof(p_updates) <> 'array' then
    raise exception 'Stock update payload must be a JSON array';
  end if;

  if jsonb_array_length(p_updates) = 0 then
    return;
  end if;

  with parsed_updates as materialized (
    select
      (update_record.value->>'id')::uuid as item_id,
      (update_record.value->>'increment')::numeric as stock_delta
    from jsonb_array_elements(p_updates) as update_record(value)
  ),
  aggregated_updates as materialized (
    select
      item_id,
      sum(stock_delta) as stock_delta
    from parsed_updates
    group by item_id
    having sum(stock_delta) <> 0
  ),
  updated_items as (
    update public.items item
      set
        stock = coalesce(item.stock, 0) + aggregated_updates.stock_delta,
        updated_at = now()
    from aggregated_updates
    where item.id = aggregated_updates.item_id
    returning item.id
  )
  select count(*)
  into v_missing_count
  from aggregated_updates
  left join updated_items on updated_items.id = aggregated_updates.item_id
  where updated_items.id is null;

  if v_missing_count > 0 then
    raise exception 'One or more stock update items do not exist';
  end if;
end;
$function$;

revoke all on function public.apply_item_stock_deltas(jsonb) from public;
revoke all on function public.apply_item_stock_deltas(jsonb) from anon;
grant execute on function public.apply_item_stock_deltas(jsonb) to authenticated;
grant execute on function public.apply_item_stock_deltas(jsonb) to service_role;

commit;
