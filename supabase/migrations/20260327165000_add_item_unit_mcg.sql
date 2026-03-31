insert into public.item_units (code, name, description)
values ('mcg', 'MICROGRAM', '')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;
