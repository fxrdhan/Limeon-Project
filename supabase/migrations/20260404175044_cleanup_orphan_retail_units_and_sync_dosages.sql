create or replace function public.sync_inventory_unit_from_item_dosage()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  matched_inventory_unit_id uuid;
begin
  if tg_op = 'INSERT' then
    select inventory_unit.id
    into matched_inventory_unit_id
    from public.item_inventory_units inventory_unit
    where inventory_unit.source_dosage_id = new.id
    limit 1;

    if matched_inventory_unit_id is null then
      select inventory_unit.id
      into matched_inventory_unit_id
      from public.item_inventory_units inventory_unit
      where lower(inventory_unit.name) = lower(new.name)
        and inventory_unit.source_package_id is null
        and inventory_unit.source_dosage_id is null
      order by
        case inventory_unit.kind
          when 'retail_unit' then 0
          when 'custom' then 1
          else 2
        end,
        inventory_unit.updated_at desc nulls last,
        inventory_unit.created_at desc nulls last
      limit 1;
    end if;

    if matched_inventory_unit_id is not null then
      update public.item_inventory_units
      set
        name = new.name,
        code = new.code,
        kind = 'retail_unit',
        source_dosage_id = new.id,
        description = new.description,
        updated_at = now()
      where id = matched_inventory_unit_id;
    else
      insert into public.item_inventory_units (
        name,
        code,
        kind,
        source_dosage_id,
        description,
        created_at,
        updated_at
      ) values (
        new.name,
        new.code,
        'retail_unit',
        new.id,
        new.description,
        coalesce(new.created_at, now()),
        coalesce(new.updated_at, now())
      );
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    update public.item_inventory_units
    set
      name = new.name,
      code = new.code,
      kind = 'retail_unit',
      source_dosage_id = new.id,
      description = new.description,
      updated_at = now()
    where source_dosage_id = new.id;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if exists (
      select 1
      from public.items item
      where item.base_inventory_unit_id in (
        select inventory_unit.id
        from public.item_inventory_units inventory_unit
        where inventory_unit.source_dosage_id = old.id
      )
    ) or exists (
      select 1
      from public.item_unit_hierarchy hierarchy
      where hierarchy.inventory_unit_id in (
        select inventory_unit.id
        from public.item_inventory_units inventory_unit
        where inventory_unit.source_dosage_id = old.id
      )
         or hierarchy.parent_inventory_unit_id in (
           select inventory_unit.id
           from public.item_inventory_units inventory_unit
           where inventory_unit.source_dosage_id = old.id
         )
    ) or exists (
      select 1
      from public.purchase_items purchase_item
      where purchase_item.inventory_unit_id in (
        select inventory_unit.id
        from public.item_inventory_units inventory_unit
        where inventory_unit.source_dosage_id = old.id
      )
    ) or exists (
      select 1
      from public.sale_items sale_item
      where sale_item.inventory_unit_id in (
        select inventory_unit.id
        from public.item_inventory_units inventory_unit
        where inventory_unit.source_dosage_id = old.id
      )
    ) then
      update public.item_inventory_units
      set
        source_dosage_id = null,
        updated_at = now()
      where source_dosage_id = old.id;
    else
      delete from public.item_inventory_units
      where source_dosage_id = old.id;
    end if;

    return old;
  end if;

  return null;
end;
$function$;

drop trigger if exists sync_inventory_unit_from_item_dosage
  on public.item_dosages;

create trigger sync_inventory_unit_from_item_dosage
after insert or update or delete on public.item_dosages
for each row
execute function public.sync_inventory_unit_from_item_dosage();

delete from public.item_inventory_units inventory_unit
where inventory_unit.kind = 'retail_unit'
  and inventory_unit.source_package_id is null
  and inventory_unit.source_dosage_id is null
  and not exists (
    select 1
    from public.items item
    where item.base_inventory_unit_id = inventory_unit.id
  )
  and not exists (
    select 1
    from public.item_unit_hierarchy hierarchy
    where hierarchy.inventory_unit_id = inventory_unit.id
       or hierarchy.parent_inventory_unit_id = inventory_unit.id
  )
  and not exists (
    select 1
    from public.purchase_items purchase_item
    where purchase_item.inventory_unit_id = inventory_unit.id
  )
  and not exists (
    select 1
    from public.sale_items sale_item
    where sale_item.inventory_unit_id = inventory_unit.id
  );
