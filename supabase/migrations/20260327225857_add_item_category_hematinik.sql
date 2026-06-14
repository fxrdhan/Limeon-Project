insert into public.item_categories (code, name, description)
values (
  'HTK',
  'Hematinik',
  'Terapi anemia, hematinik, zat besi, folat, vitamin B12, dan terapi pendukung pembentukan darah.'
)
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;
