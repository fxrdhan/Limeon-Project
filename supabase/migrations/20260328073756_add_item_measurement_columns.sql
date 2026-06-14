alter table public.items
  add column if not exists measurement_value numeric,
  add column if not exists measurement_unit_id uuid,
  add column if not exists measurement_denominator_value numeric,
  add column if not exists measurement_denominator_unit_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'items_measurement_unit_id_fkey'
  ) then
    alter table public.items
      add constraint items_measurement_unit_id_fkey
      foreign key (measurement_unit_id) references public.item_units (id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'items_measurement_denominator_unit_id_fkey'
  ) then
    alter table public.items
      add constraint items_measurement_denominator_unit_id_fkey
      foreign key (measurement_denominator_unit_id)
      references public.item_units (id);
  end if;
end $$;

comment on column public.items.measurement_value is
  'Nilai strength/kandungan utama item, mis. 500 pada 500 mg.';

comment on column public.items.measurement_unit_id is
  'Foreign key ke item_units untuk satuan strength/kandungan utama item.';

comment on column public.items.measurement_denominator_value is
  'Nilai penyebut untuk bentuk rasio, mis. 5 pada 125 mg/5 mL.';

comment on column public.items.measurement_denominator_unit_id is
  'Foreign key ke item_units untuk satuan penyebut rasio item.';
