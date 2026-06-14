insert into public.item_units (code, name, description)
values
  ('ng', 'NANOGRAM', 'Satuan kandungan sangat kecil untuk produk farmasi tertentu.'),
  ('uL', 'MICROLITER', 'Satuan volume kecil untuk sediaan injeksi, tetes, atau laboratorium.'),
  ('mEq', 'MILLIEQUIVALENT', 'Satuan ekuivalen yang umum dipakai pada elektrolit dan cairan infus.'),
  ('mmol', 'MILLIMOLE', 'Satuan jumlah zat yang dipakai pada produk dan larutan tertentu.'),
  ('%', 'PERCENT', 'Satuan konsentrasi persen seperti 0.9% atau 2%.')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;
