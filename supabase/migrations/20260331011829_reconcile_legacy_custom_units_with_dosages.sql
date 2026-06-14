update public.item_inventory_units inventory_unit
set
  kind = 'retail_unit',
  source_dosage_id = dosage.id,
  updated_at = now()
from public.item_dosages dosage
where inventory_unit.kind = 'custom'
  and inventory_unit.source_package_id is null
  and inventory_unit.source_dosage_id is null
  and lower(inventory_unit.name) = lower(dosage.name)
  and not exists (
    select 1
    from public.item_inventory_units linked_unit
    where linked_unit.source_dosage_id = dosage.id
      and linked_unit.id <> inventory_unit.id
  );
