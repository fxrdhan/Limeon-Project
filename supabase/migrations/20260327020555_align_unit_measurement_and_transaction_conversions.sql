comment on table public.item_units is
  'Master satuan ukur / kandungan item (mg, mL, g, IU), bukan satuan stok atau kemasan jual.';

comment on column public.items.base_unit is
  'Satuan stok dasar item dalam bentuk nama kemasan dari item_packages.';

comment on column public.items.package_conversions is
  'Konversi kemasan terhadap satuan stok dasar. conversion_rate menyatakan jumlah satuan stok dasar di dalam 1 kemasan turunan.';

alter table public.purchase_items
  add column if not exists unit_id uuid,
  add column if not exists unit_conversion_rate numeric not null default 1;

alter table public.sale_items
  add column if not exists unit_id uuid,
  add column if not exists unit_conversion_rate numeric not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'purchase_items_unit_id_fkey'
  ) then
    alter table public.purchase_items
      add constraint purchase_items_unit_id_fkey
      foreign key (unit_id) references public.item_packages (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'sale_items_unit_id_fkey'
  ) then
    alter table public.sale_items
      add constraint sale_items_unit_id_fkey
      foreign key (unit_id) references public.item_packages (id);
  end if;
end $$;

comment on column public.purchase_items.unit_id is
  'Kemasan/unit transaksi yang dipilih pengguna, mengacu ke item_packages.';

comment on column public.purchase_items.unit_conversion_rate is
  'Jumlah satuan stok dasar yang diwakili oleh 1 unit transaksi.';

comment on column public.sale_items.unit_id is
  'Kemasan/unit transaksi yang dipilih pengguna, mengacu ke item_packages.';

comment on column public.sale_items.unit_conversion_rate is
  'Jumlah satuan stok dasar yang diwakili oleh 1 unit transaksi.';

update public.purchase_items purchase_item
set unit_id = package.id
from public.item_packages package
where purchase_item.unit_id is null
  and purchase_item.unit is not null
  and lower(package.name) = lower(purchase_item.unit);

update public.sale_items sale_item
set unit_id = package.id
from public.item_packages package
where sale_item.unit_id is null
  and sale_item.unit_name is not null
  and lower(package.name) = lower(sale_item.unit_name);

with purchase_rates as (
  select
    purchase_item.id,
    coalesce(
      (
        select (conversion ->> 'conversion_rate')::numeric
        from jsonb_array_elements(coalesce(item.package_conversions, '[]'::jsonb)) conversion
        where lower(conversion ->> 'unit_name') = lower(purchase_item.unit)
        limit 1
      ),
      1
    ) as conversion_rate
  from public.purchase_items purchase_item
  join public.items item on item.id = purchase_item.item_id
)
update public.purchase_items purchase_item
set unit_conversion_rate = purchase_rates.conversion_rate
from purchase_rates
where purchase_item.id = purchase_rates.id
  and (
    purchase_item.unit_conversion_rate is null
    or purchase_item.unit_conversion_rate = 1
  );

with sale_rates as (
  select
    sale_item.id,
    coalesce(
      (
        select (conversion ->> 'conversion_rate')::numeric
        from jsonb_array_elements(coalesce(item.package_conversions, '[]'::jsonb)) conversion
        where lower(conversion ->> 'unit_name') = lower(sale_item.unit_name)
        limit 1
      ),
      1
    ) as conversion_rate
  from public.sale_items sale_item
  join public.items item on item.id = sale_item.item_id
)
update public.sale_items sale_item
set unit_conversion_rate = sale_rates.conversion_rate
from sale_rates
where sale_item.id = sale_rates.id
  and (
    sale_item.unit_conversion_rate is null
    or sale_item.unit_conversion_rate = 1
  );

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
      v_unit_conversion_rate
    );

    update items
      set stock = coalesce(stock, 0) + (v_quantity * v_unit_conversion_rate)
    where id = v_item_id;
  end loop;

  return purchase_id;
end;
$function$;

create or replace function public.delete_purchase_with_stock_restore(
  p_purchase_id uuid
)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  rec record;
begin
  for rec in
    select
      item_id,
      quantity,
      coalesce(unit_conversion_rate, 1) as unit_conversion_rate
    from purchase_items
    where purchase_id = p_purchase_id
  loop
    update items
      set stock = greatest(
        coalesce(stock, 0) - (rec.quantity * rec.unit_conversion_rate),
        0
      )
    where id = rec.item_id;
  end loop;

  delete from purchase_items where purchase_id = p_purchase_id;
  delete from purchases where id = p_purchase_id;
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
      unit_conversion_rate
    ) values (
      sale_id,
      v_item_id,
      v_quantity::integer,
      v_price,
      v_subtotal,
      v_unit_name,
      v_unit_id,
      v_unit_conversion_rate
    );

    update items
      set stock = coalesce(stock, 0) - (v_quantity * v_unit_conversion_rate)
    where id = v_item_id;
  end loop;

  return sale_id;
end;
$function$;

create or replace function public.delete_sale_with_stock_restore(
  p_sale_id uuid
)
returns void
language plpgsql
set search_path to 'public'
as $function$
declare
  rec record;
begin
  for rec in
    select
      item_id,
      quantity,
      coalesce(unit_conversion_rate, 1) as unit_conversion_rate
    from sale_items
    where sale_id = p_sale_id
  loop
    update items
      set stock = coalesce(stock, 0) + (rec.quantity * rec.unit_conversion_rate)
    where id = rec.item_id;
  end loop;

  delete from sale_items where sale_id = p_sale_id;
  delete from sales where id = p_sale_id;
end;
$function$;
