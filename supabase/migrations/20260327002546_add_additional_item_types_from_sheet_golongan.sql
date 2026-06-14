insert into public.item_types (code, name, description)
values
  ('ALK', 'Alat Kesehatan', 'Produk alat kesehatan dari sheet per-manufacturer.'),
  ('SUP', 'Suplemen', 'Suplemen kesehatan dan vitamin dari sheet per-manufacturer.'),
  ('OBA', 'Obat Bahan Alam', 'Obat tradisional / bahan alam dari sheet per-manufacturer.'),
  ('PKR', 'Perbekalan Kesehatan Rumah Tangga', 'PKRT dari sheet per-manufacturer.'),
  ('COS', 'Kosmetik', 'Produk kosmetik dari sheet per-manufacturer.'),
  ('OKS', 'Obat Kuasi', 'Produk obat kuasi dari sheet per-manufacturer.'),
  ('PPG', 'Produk Pangan', 'Produk pangan dari sheet per-manufacturer.')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description,
  updated_at = now();
