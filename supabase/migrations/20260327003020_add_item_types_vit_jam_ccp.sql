insert into public.item_types (code, name, description)
values
  ('VIT', 'Vitamin', 'Produk vitamin dari sheet per-manufacturer.'),
  ('JAM', 'Jamu', 'Produk jamu dari sheet per-manufacturer.'),
  ('CCP', 'Cold Chain Product', 'Produk cold chain dari sheet per-manufacturer.')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();
