insert into public.item_units (code, name, description)
values ('GA', 'GAUGE', '')
on conflict (code) do update
set
  name = excluded.name,
  description = excluded.description;
