alter table public.item_inventory_units enable row level security;
alter table public.item_unit_hierarchy enable row level security;

create index if not exists idx_items_base_inventory_unit_id
  on public.items (base_inventory_unit_id);

create index if not exists idx_item_unit_hierarchy_inventory_unit_id
  on public.item_unit_hierarchy (inventory_unit_id);

create index if not exists idx_purchase_items_inventory_unit_id
  on public.purchase_items (inventory_unit_id);

create index if not exists idx_sale_items_inventory_unit_id
  on public.sale_items (inventory_unit_id);

drop policy if exists "Allow authenticated users to delete inventory units"
  on public.item_inventory_units;
drop policy if exists "Allow authenticated users to insert inventory units"
  on public.item_inventory_units;
drop policy if exists "Allow authenticated users to update inventory units"
  on public.item_inventory_units;
drop policy if exists "Allow authenticated users to view inventory units"
  on public.item_inventory_units;

create policy "Allow authenticated users to delete inventory units"
  on public.item_inventory_units
  for delete
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to insert inventory units"
  on public.item_inventory_units
  for insert
  to public
  with check ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to update inventory units"
  on public.item_inventory_units
  for update
  to public
  using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to view inventory units"
  on public.item_inventory_units
  for select
  to public
  using ((select auth.role()) = 'authenticated');

drop policy if exists "Allow authenticated users to delete item unit hierarchy"
  on public.item_unit_hierarchy;
drop policy if exists "Allow authenticated users to insert item unit hierarchy"
  on public.item_unit_hierarchy;
drop policy if exists "Allow authenticated users to update item unit hierarchy"
  on public.item_unit_hierarchy;
drop policy if exists "Allow authenticated users to view item unit hierarchy"
  on public.item_unit_hierarchy;

create policy "Allow authenticated users to delete item unit hierarchy"
  on public.item_unit_hierarchy
  for delete
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to insert item unit hierarchy"
  on public.item_unit_hierarchy
  for insert
  to public
  with check ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to update item unit hierarchy"
  on public.item_unit_hierarchy
  for update
  to public
  using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to view item unit hierarchy"
  on public.item_unit_hierarchy
  for select
  to public
  using ((select auth.role()) = 'authenticated');
