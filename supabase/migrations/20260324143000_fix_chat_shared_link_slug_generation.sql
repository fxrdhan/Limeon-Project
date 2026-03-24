begin;

create or replace function public.generate_chat_shared_link_slug()
returns text
language plpgsql
set search_path = public
as $function$
declare
  slug_alphabet constant text := '23456789abcdefghjkmnpqrstuvwxyz';
  slug_length constant integer := 10;
  slug_random_bytes bytea := extensions.gen_random_bytes(slug_length);
  slug text := '';
  byte_index integer;
begin
  for byte_index in 0..slug_length - 1 loop
    slug := slug
      || substr(
        slug_alphabet,
        (get_byte(slug_random_bytes, byte_index) % length(slug_alphabet)) + 1,
        1
      );
  end loop;

  return slug;
end;
$function$;

commit;
