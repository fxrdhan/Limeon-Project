drop index if exists public.item_inventory_units_name_key;

create index if not exists idx_item_inventory_units_name
  on public.item_inventory_units (lower(name));
