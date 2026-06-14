insert into public.item_categories (code, name, description)
values
  ('AFL', 'Antiflatulen', 'Obat kembung, gas berlebih, dan karminatif.'),
  ('DLP', 'Dislipidemia', 'Obat penurun kolesterol, trigliserida, dan terapi lipid.'),
  ('HMR', 'Hemoroid', 'Obat wasir dan terapi simptomatik hemoroid.'),
  ('INO', 'Inotropik', 'Obat inotropik dan kardiotonik untuk dukungan fungsi jantung.'),
  ('MDV', 'Medical Device', 'Alat kesehatan, alat diagnostik, dan aksesori medis.'),
  ('ONK', 'Onkologi', 'Obat kemoterapi, antineoplastik, dan terapi kanker.'),
  ('URO', 'Urologi', 'Obat dan terapi gangguan saluran kemih atau kandung kemih.')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;
