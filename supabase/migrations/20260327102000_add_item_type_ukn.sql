insert into public.item_types (code, name, description)
values
  ('UKN', 'Unknown', 'Produk dengan golongan Other dari sheet per-manufacturer.')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();
