insert into public.item_categories (code, name, description)
values ('UNK', 'Unknown', 'Kategori fallback untuk item dengan kegunaan Other atau belum terklasifikasi.')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;
