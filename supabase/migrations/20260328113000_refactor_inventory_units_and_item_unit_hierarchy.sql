create table if not exists public.item_inventory_units (
  id uuid primary key default gen_random_uuid(),
  name character varying not null,
  code character varying,
  kind text not null,
  source_package_id uuid references public.item_packages (id) on delete set null,
  source_dosage_id uuid references public.item_dosages (id) on delete set null,
  description text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint item_inventory_units_kind_check
    check (kind in ('packaging', 'retail_unit', 'custom')),
  constraint item_inventory_units_source_origin_check
    check (
      source_package_id is null
      or source_dosage_id is null
    )
);

create unique index if not exists item_inventory_units_name_key
  on public.item_inventory_units (lower(name));

create unique index if not exists item_inventory_units_source_package_key
  on public.item_inventory_units (source_package_id)
  where source_package_id is not null;

create unique index if not exists item_inventory_units_source_dosage_key
  on public.item_inventory_units (source_dosage_id)
  where source_dosage_id is not null;

create table if not exists public.item_unit_hierarchy (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  inventory_unit_id uuid not null
    references public.item_inventory_units (id) on delete restrict,
  parent_inventory_unit_id uuid
    references public.item_inventory_units (id) on delete restrict,
  contains_quantity numeric not null default 1,
  factor_to_base numeric not null default 1,
  base_price_override numeric,
  sell_price_override numeric,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint item_unit_hierarchy_contains_quantity_check
    check (contains_quantity > 0),
  constraint item_unit_hierarchy_factor_to_base_check
    check (factor_to_base > 0),
  constraint item_unit_hierarchy_unique_item_unit
    unique (item_id, inventory_unit_id),
  constraint item_unit_hierarchy_base_parent_check
    check (
      (
        parent_inventory_unit_id is null
        and contains_quantity = 1
        and factor_to_base = 1
      )
      or parent_inventory_unit_id is not null
    )
);

create index if not exists item_unit_hierarchy_item_id_idx
  on public.item_unit_hierarchy (item_id);

create index if not exists item_unit_hierarchy_parent_unit_idx
  on public.item_unit_hierarchy (parent_inventory_unit_id);

alter table public.items
  add column if not exists base_inventory_unit_id uuid;

alter table public.purchase_items
  add column if not exists inventory_unit_id uuid;

alter table public.sale_items
  add column if not exists inventory_unit_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'items_base_inventory_unit_id_fkey'
  ) then
    alter table public.items
      add constraint items_base_inventory_unit_id_fkey
      foreign key (base_inventory_unit_id)
      references public.item_inventory_units (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_items_inventory_unit_id_fkey'
  ) then
    alter table public.purchase_items
      add constraint purchase_items_inventory_unit_id_fkey
      foreign key (inventory_unit_id)
      references public.item_inventory_units (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sale_items_inventory_unit_id_fkey'
  ) then
    alter table public.sale_items
      add constraint sale_items_inventory_unit_id_fkey
      foreign key (inventory_unit_id)
      references public.item_inventory_units (id);
  end if;
end $$;

comment on table public.item_inventory_units is
  'Master unit stok dan jual item. Bisa berasal dari kemasan, unit ecer, atau custom operasional.';

comment on column public.item_inventory_units.kind is
  'Jenis unit stok/jual: packaging, retail_unit, atau custom.';

comment on column public.items.base_inventory_unit_id is
  'Unit dasar stok dan harga item. Harga pokok/jual item disimpan terhadap unit ini.';

comment on table public.item_unit_hierarchy is
  'Struktur unit jual per item. Setiap row menyatakan 1 unit berisi sejumlah unit parent dan menyimpan faktor kumulatif ke unit dasar.';

comment on column public.item_unit_hierarchy.contains_quantity is
  'Jumlah unit parent yang terkandung dalam 1 inventory_unit_id.';

comment on column public.item_unit_hierarchy.factor_to_base is
  'Faktor kumulatif terhadap unit dasar item. 1 untuk unit dasar.';

comment on column public.purchase_items.inventory_unit_id is
  'Unit stok/jual transaksi pembelian yang mengacu ke item_inventory_units.';

comment on column public.sale_items.inventory_unit_id is
  'Unit stok/jual transaksi penjualan yang mengacu ke item_inventory_units.';

insert into public.item_inventory_units (
  id,
  name,
  code,
  kind,
  source_package_id,
  description,
  created_at,
  updated_at
)
select
  package.id,
  package.name,
  package.code,
  'packaging',
  package.id,
  package.description,
  coalesce(package.created_at, now()),
  coalesce(package.updated_at, now())
from public.item_packages package
on conflict (id) do update
set
  name = excluded.name,
  code = excluded.code,
  kind = excluded.kind,
  source_package_id = excluded.source_package_id,
  description = excluded.description,
  updated_at = now();

with missing_base_units as (
  select distinct
    item.id as item_id,
    trim(coalesce(item.base_unit, '')) as base_unit_name
  from public.items item
  where item.base_inventory_unit_id is null
    and trim(coalesce(item.base_unit, '')) <> ''
    and not exists (
      select 1
      from public.item_inventory_units inventory_unit
      where lower(inventory_unit.name) = lower(trim(item.base_unit))
    )
)
insert into public.item_inventory_units (
  name,
  kind,
  description
)
select
  missing_base_units.base_unit_name,
  'custom',
  'Backfilled from legacy items.base_unit'
from missing_base_units
on conflict ((lower(name))) do nothing;

update public.items item
set base_inventory_unit_id = resolved.inventory_unit_id
from (
  select
    item_inner.id as item_id,
    coalesce(
      inventory_from_base.id,
      inventory_from_package.id
    ) as inventory_unit_id
  from public.items item_inner
  left join public.item_inventory_units inventory_from_base
    on lower(inventory_from_base.name) = lower(trim(coalesce(item_inner.base_unit, '')))
  left join public.item_inventory_units inventory_from_package
    on inventory_from_package.id = item_inner.package_id
) resolved
where item.id = resolved.item_id
  and resolved.inventory_unit_id is not null
  and item.base_inventory_unit_id is distinct from resolved.inventory_unit_id;

insert into public.item_unit_hierarchy (
  item_id,
  inventory_unit_id,
  parent_inventory_unit_id,
  contains_quantity,
  factor_to_base,
  created_at,
  updated_at
)
select
  item.id,
  item.base_inventory_unit_id,
  null,
  1,
  1,
  now(),
  now()
from public.items item
where item.base_inventory_unit_id is not null
on conflict (item_id, inventory_unit_id) do update
set
  parent_inventory_unit_id = excluded.parent_inventory_unit_id,
  contains_quantity = excluded.contains_quantity,
  factor_to_base = excluded.factor_to_base,
  updated_at = now();

with legacy_conversions as (
  select
    item.id as item_id,
    item.base_inventory_unit_id,
    conversion.value as conversion
  from public.items item
  cross join lateral jsonb_array_elements(
    coalesce(item.package_conversions, '[]'::jsonb)
  ) as conversion(value)
  where item.base_inventory_unit_id is not null
),
resolved_conversions as (
  select
    legacy_conversions.item_id,
    coalesce(
      nullif(legacy_conversions.conversion ->> 'to_unit_id', '')::uuid,
      inventory_unit.id
    ) as inventory_unit_id,
    legacy_conversions.base_inventory_unit_id as parent_inventory_unit_id,
    greatest(
      coalesce((legacy_conversions.conversion ->> 'conversion_rate')::numeric, 1),
      1
    ) as contains_quantity,
    coalesce(legacy_conversions.conversion ->> 'unit_name', inventory_unit.name) as unit_name,
    nullif(legacy_conversions.conversion ->> 'base_price', '')::numeric as base_price_override,
    nullif(legacy_conversions.conversion ->> 'sell_price', '')::numeric as sell_price_override
  from legacy_conversions
  left join public.item_inventory_units inventory_unit
    on lower(inventory_unit.name) = lower(
      trim(coalesce(legacy_conversions.conversion ->> 'unit_name', ''))
    )
),
missing_conversion_units as (
  select distinct
    resolved_conversions.unit_name
  from resolved_conversions
  where resolved_conversions.inventory_unit_id is null
    and trim(coalesce(resolved_conversions.unit_name, '')) <> ''
)
insert into public.item_inventory_units (
  name,
  kind,
  description
)
select
  missing_conversion_units.unit_name,
  'custom',
  'Backfilled from legacy package_conversions'
from missing_conversion_units
on conflict ((lower(name))) do nothing;

with resolved_conversions as (
  select
    item.id as item_id,
    item.base_inventory_unit_id as parent_inventory_unit_id,
    coalesce(
      nullif(conversion.value ->> 'to_unit_id', '')::uuid,
      inventory_unit.id
    ) as inventory_unit_id,
    greatest(
      coalesce((conversion.value ->> 'conversion_rate')::numeric, 1),
      1
    ) as contains_quantity,
    nullif(conversion.value ->> 'base_price', '')::numeric as base_price_override,
    nullif(conversion.value ->> 'sell_price', '')::numeric as sell_price_override
  from public.items item
  cross join lateral jsonb_array_elements(
    coalesce(item.package_conversions, '[]'::jsonb)
  ) as conversion(value)
  left join public.item_inventory_units inventory_unit
    on inventory_unit.id = nullif(conversion.value ->> 'to_unit_id', '')::uuid
    or lower(inventory_unit.name) = lower(
      trim(coalesce(conversion.value ->> 'unit_name', ''))
    )
  where item.base_inventory_unit_id is not null
)
insert into public.item_unit_hierarchy (
  item_id,
  inventory_unit_id,
  parent_inventory_unit_id,
  contains_quantity,
  factor_to_base,
  base_price_override,
  sell_price_override,
  created_at,
  updated_at
)
select
  resolved_conversions.item_id,
  resolved_conversions.inventory_unit_id,
  resolved_conversions.parent_inventory_unit_id,
  resolved_conversions.contains_quantity,
  resolved_conversions.contains_quantity,
  resolved_conversions.base_price_override,
  resolved_conversions.sell_price_override,
  now(),
  now()
from resolved_conversions
where resolved_conversions.inventory_unit_id is not null
on conflict (item_id, inventory_unit_id) do update
set
  parent_inventory_unit_id = excluded.parent_inventory_unit_id,
  contains_quantity = excluded.contains_quantity,
  factor_to_base = excluded.factor_to_base,
  base_price_override = excluded.base_price_override,
  sell_price_override = excluded.sell_price_override,
  updated_at = now();

update public.purchase_items purchase_item
set inventory_unit_id = coalesce(
  purchase_item.unit_id,
  inventory_unit.id
)
from public.item_inventory_units inventory_unit
where purchase_item.inventory_unit_id is null
  and purchase_item.unit is not null
  and lower(inventory_unit.name) = lower(purchase_item.unit);

update public.sale_items sale_item
set inventory_unit_id = coalesce(
  sale_item.unit_id,
  inventory_unit.id
)
from public.item_inventory_units inventory_unit
where sale_item.inventory_unit_id is null
  and sale_item.unit_name is not null
  and lower(inventory_unit.name) = lower(sale_item.unit_name);

create or replace function public.process_purchase_v2(
  p_supplier_id uuid,
  p_invoice_number character varying,
  p_date date,
  p_total numeric,
  p_payment_status character varying,
  p_payment_method character varying,
  p_notes text,
  p_due_date date,
  p_vat_amount numeric,
  p_vat_percentage numeric,
  p_is_vat_included boolean,
  p_customer_name character varying,
  p_customer_address text,
  p_items jsonb
)
returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  purchase_id uuid;
  item_record jsonb;
  v_item_id uuid;
  v_quantity numeric;
  v_price numeric;
  v_subtotal numeric;
  v_discount numeric;
  v_vat_percentage numeric;
  v_batch_no text;
  v_expiry_date date;
  v_unit text;
  v_unit_id uuid;
  v_inventory_unit_id uuid;
  v_unit_conversion_rate numeric;
begin
  insert into purchases (
    supplier_id,
    invoice_number,
    date,
    total,
    payment_status,
    payment_method,
    notes,
    due_date,
    vat_amount,
    vat_percentage,
    is_vat_included,
    customer_name,
    customer_address
  ) values (
    p_supplier_id,
    p_invoice_number,
    p_date,
    p_total,
    p_payment_status,
    p_payment_method,
    p_notes,
    p_due_date,
    p_vat_amount,
    p_vat_percentage,
    p_is_vat_included,
    p_customer_name,
    p_customer_address
  )
  returning id into purchase_id;

  for item_record in select * from jsonb_array_elements(p_items) loop
    v_item_id := (item_record->>'item_id')::uuid;
    v_quantity := coalesce((item_record->>'quantity')::numeric, 0);
    v_price := coalesce((item_record->>'price')::numeric, 0);
    v_subtotal := coalesce((item_record->>'subtotal')::numeric, 0);
    v_discount := coalesce((item_record->>'discount')::numeric, 0);
    v_vat_percentage := coalesce((item_record->>'vat_percentage')::numeric, 0);
    v_batch_no := nullif(item_record->>'batch_no', '');
    v_expiry_date := nullif(item_record->>'expiry_date', '')::date;
    v_unit := nullif(item_record->>'unit', '');
    v_unit_id := nullif(item_record->>'unit_id', '')::uuid;
    v_inventory_unit_id := nullif(item_record->>'inventory_unit_id', '')::uuid;
    v_unit_conversion_rate :=
      greatest(coalesce((item_record->>'unit_conversion_rate')::numeric, 1), 1);

    insert into purchase_items (
      purchase_id,
      item_id,
      quantity,
      price,
      subtotal,
      discount,
      vat_percentage,
      batch_no,
      expiry_date,
      unit,
      unit_id,
      inventory_unit_id,
      unit_conversion_rate
    ) values (
      purchase_id,
      v_item_id,
      v_quantity::integer,
      v_price,
      v_subtotal,
      v_discount,
      v_vat_percentage,
      v_batch_no,
      v_expiry_date,
      v_unit,
      v_unit_id,
      coalesce(v_inventory_unit_id, v_unit_id),
      v_unit_conversion_rate
    );

    update items
      set stock = coalesce(stock, 0) + (v_quantity * v_unit_conversion_rate)
    where id = v_item_id;
  end loop;

  return purchase_id;
end;
$function$;

create or replace function public.process_sale_v1(
  p_patient_id uuid,
  p_doctor_id uuid,
  p_customer_id uuid,
  p_invoice_number character varying,
  p_date date,
  p_total numeric,
  p_payment_method character varying,
  p_created_by uuid,
  p_items jsonb
)
returns uuid
language plpgsql
set search_path to 'public'
as $function$
declare
  sale_id uuid;
  item_record jsonb;
  v_item_id uuid;
  v_quantity numeric;
  v_price numeric;
  v_subtotal numeric;
  v_unit_name text;
  v_unit_id uuid;
  v_inventory_unit_id uuid;
  v_unit_conversion_rate numeric;
begin
  insert into sales (
    patient_id,
    doctor_id,
    customer_id,
    invoice_number,
    date,
    total,
    payment_method,
    created_by
  ) values (
    p_patient_id,
    p_doctor_id,
    p_customer_id,
    p_invoice_number,
    p_date,
    p_total,
    p_payment_method,
    p_created_by
  )
  returning id into sale_id;

  for item_record in select * from jsonb_array_elements(p_items) loop
    v_item_id := (item_record->>'item_id')::uuid;
    v_quantity := coalesce((item_record->>'quantity')::numeric, 0);
    v_price := coalesce((item_record->>'price')::numeric, 0);
    v_subtotal := coalesce((item_record->>'subtotal')::numeric, 0);
    v_unit_name := nullif(item_record->>'unit_name', '');
    v_unit_id := nullif(item_record->>'unit_id', '')::uuid;
    v_inventory_unit_id := nullif(item_record->>'inventory_unit_id', '')::uuid;
    v_unit_conversion_rate :=
      greatest(coalesce((item_record->>'unit_conversion_rate')::numeric, 1), 1);

    insert into sale_items (
      sale_id,
      item_id,
      quantity,
      price,
      subtotal,
      unit_name,
      unit_id,
      inventory_unit_id,
      unit_conversion_rate
    ) values (
      sale_id,
      v_item_id,
      v_quantity::integer,
      v_price,
      v_subtotal,
      v_unit_name,
      v_unit_id,
      coalesce(v_inventory_unit_id, v_unit_id),
      v_unit_conversion_rate
    );

    update items
      set stock = coalesce(stock, 0) - (v_quantity * v_unit_conversion_rate)
    where id = v_item_id;
  end loop;

  return sale_id;
end;
$function$;

create or replace function public.sync_inventory_unit_from_item_package()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if tg_op = 'INSERT' then
    insert into public.item_inventory_units (
      id,
      name,
      code,
      kind,
      source_package_id,
      description,
      created_at,
      updated_at
    ) values (
      new.id,
      new.name,
      new.code,
      'packaging',
      new.id,
      new.description,
      coalesce(new.created_at, now()),
      coalesce(new.updated_at, now())
    )
    on conflict (id) do update
    set
      name = excluded.name,
      code = excluded.code,
      kind = excluded.kind,
      source_package_id = excluded.source_package_id,
      description = excluded.description,
      updated_at = now();
    return new;
  end if;

  if tg_op = 'UPDATE' then
    update public.item_inventory_units
    set
      name = new.name,
      code = new.code,
      kind = 'packaging',
      source_package_id = new.id,
      description = new.description,
      updated_at = now()
    where id = new.id
       or source_package_id = new.id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if exists (
      select 1
      from public.items item
      where item.base_inventory_unit_id = old.id
    ) or exists (
      select 1
      from public.item_unit_hierarchy hierarchy
      where hierarchy.inventory_unit_id = old.id
         or hierarchy.parent_inventory_unit_id = old.id
    ) or exists (
      select 1
      from public.purchase_items purchase_item
      where purchase_item.inventory_unit_id = old.id
    ) or exists (
      select 1
      from public.sale_items sale_item
      where sale_item.inventory_unit_id = old.id
    ) then
      update public.item_inventory_units
      set
        source_package_id = null,
        updated_at = now()
      where id = old.id
         or source_package_id = old.id;
    else
      delete from public.item_inventory_units
      where id = old.id
         or source_package_id = old.id;
    end if;
    return old;
  end if;

  return null;
end;
$function$;

drop trigger if exists sync_inventory_unit_from_item_package on public.item_packages;

create trigger sync_inventory_unit_from_item_package
after insert or update or delete on public.item_packages
for each row
execute function public.sync_inventory_unit_from_item_package();

drop trigger if exists update_item_inventory_units_updated_at on public.item_inventory_units;

create trigger update_item_inventory_units_updated_at
before update on public.item_inventory_units
for each row
execute function public.update_updated_at_column();

drop trigger if exists update_item_unit_hierarchy_updated_at on public.item_unit_hierarchy;

create trigger update_item_unit_hierarchy_updated_at
before update on public.item_unit_hierarchy
for each row
execute function public.update_updated_at_column();
