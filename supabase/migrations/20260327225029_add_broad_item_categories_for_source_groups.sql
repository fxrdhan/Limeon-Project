insert into public.item_categories (code, name, description)
values
  ('CNS', 'Sistem Saraf Pusat', 'Kategori umum untuk produk dengan indikasi sistem saraf pusat yang belum cocok ke kategori neurologi yang lebih spesifik.'),
  ('CVS', 'Kardiovaskular', 'Kategori umum untuk produk dengan indikasi sistem kardiovaskular atau hematopoietik yang belum cocok ke kategori yang lebih spesifik.'),
  ('GIH', 'Gastrointestinal & Hepatobilier', 'Kategori umum untuk produk sistem pencernaan dan hepatobilier yang belum cocok ke kategori gastrointestinal yang lebih spesifik.'),
  ('HHC', 'Household Care', 'Produk rumah tangga seperti pelembut, pewangi, dan pelicin kain.'),
  ('HRM', 'Hormonal', 'Kategori umum untuk terapi hormonal yang belum cocok ke kategori hormon yang lebih spesifik.'),
  ('MSK', 'Muskuloskeletal', 'Kategori umum untuk produk sistem muskuloskeletal yang belum cocok ke kategori yang lebih spesifik.'),
  ('REP', 'Repelan Serangga', 'Produk pencegah atau penolak serangga.'),
  ('RSP', 'Respiratori', 'Kategori umum untuk produk sistem pernapasan, batuk, pilek, dan terapi respiratori lain yang belum cocok ke kategori yang lebih spesifik.'),
  ('TRD', 'Tradisional', 'Kategori umum untuk produk tradisional ketika fungsi terapinya tidak tersedia atau tidak terbaca secara spesifik.')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;
