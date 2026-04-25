begin;

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
as $function$
  select exists (
    select 1
    from public.users user_row
    where user_row.id = auth.uid()
      and user_row.role in ('admin', 'owner', 'super_admin')
  );
$function$;

revoke all on function public.current_user_is_admin() from public;
revoke all on function public.current_user_is_admin() from anon;
grant execute on function public.current_user_is_admin() to authenticated;
grant execute on function public.current_user_is_admin() to service_role;

drop policy if exists "Authenticated users can manage non-chat storage objects"
on storage.objects;

drop policy if exists "Authenticated users can read public media objects"
on storage.objects;
create policy "Authenticated users can read public media objects"
  on storage.objects
  for select
  to authenticated
  using (bucket_id in ('profiles', 'patients', 'suppliers', 'item_images', 'invoice-images'));

drop policy if exists "Users can manage their profile photo objects"
on storage.objects;
create policy "Users can manage their profile photo objects"
  on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'profiles'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] in ('suppliers', 'patients', 'doctors')
    )
  )
  with check (
    bucket_id = 'profiles'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (storage.foldername(name))[1] in ('suppliers', 'patients', 'doctors')
    )
  );

drop policy if exists "Authenticated users can manage item images"
on storage.objects;
create policy "Authenticated users can manage item images"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'item_images' and (storage.foldername(name))[1] = 'items')
  with check (bucket_id = 'item_images' and (storage.foldername(name))[1] = 'items');

drop policy if exists "Service role can manage invoice images"
on storage.objects;
create policy "Service role can manage invoice images"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'invoice-images')
  with check (bucket_id = 'invoice-images');

alter table public.chat_shared_links
  add column if not exists expires_at timestamptz;

update public.chat_shared_links
set expires_at = coalesce(expires_at, created_at + interval '7 days');

alter table public.chat_shared_links
  alter column expires_at set default (now() + interval '7 days'),
  alter column expires_at set not null;

create unique index if not exists customer_levels_level_name_lower_key
  on public.customer_levels (lower(level_name));

create unique index if not exists customer_level_discounts_item_level_key
  on public.customer_level_discounts (item_id, customer_level_id);

drop index if exists chat_shared_links_active_storage_path_key;
create unique index if not exists chat_shared_links_active_storage_path_key
  on public.chat_shared_links (storage_path)
  where revoked_at is null;

drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
  on public.user_preferences
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Authenticated can read users" on public.users;
create policy "Users can read their own profile or admins can read users"
  on public.users
  for select
  using (
    (select auth.uid()) = id
    or public.current_user_is_admin()
    or exists (
      select 1
      from public.chat_messages chat_message
      where (
        chat_message.sender_id = (select auth.uid())
        and chat_message.receiver_id = public.users.id
      )
      or (
        chat_message.receiver_id = (select auth.uid())
        and chat_message.sender_id = public.users.id
      )
    )
  );

drop policy if exists "Authenticated can view patients" on public.patients;
drop policy if exists "Authenticated can insert patients" on public.patients;
drop policy if exists "Authenticated can update patients" on public.patients;
drop policy if exists "Authenticated can delete patients" on public.patients;
create policy "Admins can view patients"
  on public.patients for select to authenticated
  using (public.current_user_is_admin());
create policy "Admins can insert patients"
  on public.patients for insert to authenticated
  with check (public.current_user_is_admin());
create policy "Admins can update patients"
  on public.patients for update to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
create policy "Admins can delete patients"
  on public.patients for delete to authenticated
  using (public.current_user_is_admin());

drop policy if exists "Authenticated can view customers" on public.customers;
drop policy if exists "Authenticated can insert customers" on public.customers;
drop policy if exists "Authenticated can update customers" on public.customers;
drop policy if exists "Authenticated can delete customers" on public.customers;
create policy "Admins can view customers"
  on public.customers for select to authenticated
  using (public.current_user_is_admin());
create policy "Admins can insert customers"
  on public.customers for insert to authenticated
  with check (public.current_user_is_admin());
create policy "Admins can update customers"
  on public.customers for update to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
create policy "Admins can delete customers"
  on public.customers for delete to authenticated
  using (public.current_user_is_admin());

drop policy if exists "Authenticated can view purchases" on public.purchases;
drop policy if exists "Authenticated can insert purchases" on public.purchases;
drop policy if exists "Authenticated can update purchases" on public.purchases;
drop policy if exists "Authenticated can delete purchases" on public.purchases;
create policy "Users can view own purchases or admins can view purchases"
  on public.purchases for select to authenticated
  using (created_by = (select auth.uid()) or public.current_user_is_admin());
create policy "Users can insert own purchases"
  on public.purchases for insert to authenticated
  with check (created_by = (select auth.uid()) or public.current_user_is_admin());
create policy "Users can update own purchases or admins can update purchases"
  on public.purchases for update to authenticated
  using (created_by = (select auth.uid()) or public.current_user_is_admin())
  with check (created_by = (select auth.uid()) or public.current_user_is_admin());
create policy "Users can delete own purchases or admins can delete purchases"
  on public.purchases for delete to authenticated
  using (created_by = (select auth.uid()) or public.current_user_is_admin());

drop policy if exists "Authenticated can view purchase items" on public.purchase_items;
drop policy if exists "Authenticated can insert purchase items" on public.purchase_items;
drop policy if exists "Authenticated can update purchase items" on public.purchase_items;
drop policy if exists "Authenticated can delete purchase items" on public.purchase_items;
create policy "Users can view own purchase items or admins can view purchase items"
  on public.purchase_items for select to authenticated
  using (
    exists (
      select 1 from public.purchases purchase
      where purchase.id = purchase_id
        and (purchase.created_by = (select auth.uid()) or public.current_user_is_admin())
    )
  );
create policy "Users can insert own purchase items"
  on public.purchase_items for insert to authenticated
  with check (
    exists (
      select 1 from public.purchases purchase
      where purchase.id = purchase_id
        and (purchase.created_by = (select auth.uid()) or public.current_user_is_admin())
    )
  );
create policy "Users can update own purchase items or admins can update purchase items"
  on public.purchase_items for update to authenticated
  using (
    exists (
      select 1 from public.purchases purchase
      where purchase.id = purchase_id
        and (purchase.created_by = (select auth.uid()) or public.current_user_is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.purchases purchase
      where purchase.id = purchase_id
        and (purchase.created_by = (select auth.uid()) or public.current_user_is_admin())
    )
  );
create policy "Users can delete own purchase items or admins can delete purchase items"
  on public.purchase_items for delete to authenticated
  using (
    exists (
      select 1 from public.purchases purchase
      where purchase.id = purchase_id
        and (purchase.created_by = (select auth.uid()) or public.current_user_is_admin())
    )
  );

drop policy if exists "Authenticated can view sales" on public.sales;
drop policy if exists "Authenticated can insert sales" on public.sales;
drop policy if exists "Authenticated can update sales" on public.sales;
drop policy if exists "Authenticated can delete sales" on public.sales;
create policy "Users can view own sales or admins can view sales"
  on public.sales for select to authenticated
  using (created_by = (select auth.uid()) or public.current_user_is_admin());
create policy "Users can insert own sales"
  on public.sales for insert to authenticated
  with check (created_by = (select auth.uid()) or public.current_user_is_admin());
create policy "Users can update own sales or admins can update sales"
  on public.sales for update to authenticated
  using (created_by = (select auth.uid()) or public.current_user_is_admin())
  with check (created_by = (select auth.uid()) or public.current_user_is_admin());
create policy "Users can delete own sales or admins can delete sales"
  on public.sales for delete to authenticated
  using (created_by = (select auth.uid()) or public.current_user_is_admin());

drop policy if exists "Authenticated can view sale items" on public.sale_items;
drop policy if exists "Authenticated can insert sale items" on public.sale_items;
drop policy if exists "Authenticated can update sale items" on public.sale_items;
drop policy if exists "Authenticated can delete sale items" on public.sale_items;
create policy "Users can view own sale items or admins can view sale items"
  on public.sale_items for select to authenticated
  using (
    exists (
      select 1 from public.sales sale
      where sale.id = sale_id
        and (sale.created_by = (select auth.uid()) or public.current_user_is_admin())
    )
  );
create policy "Users can insert own sale items"
  on public.sale_items for insert to authenticated
  with check (
    exists (
      select 1 from public.sales sale
      where sale.id = sale_id
        and (sale.created_by = (select auth.uid()) or public.current_user_is_admin())
    )
  );
create policy "Users can update own sale items or admins can update sale items"
  on public.sale_items for update to authenticated
  using (
    exists (
      select 1 from public.sales sale
      where sale.id = sale_id
        and (sale.created_by = (select auth.uid()) or public.current_user_is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.sales sale
      where sale.id = sale_id
        and (sale.created_by = (select auth.uid()) or public.current_user_is_admin())
    )
  );
create policy "Users can delete own sale items or admins can delete sale items"
  on public.sale_items for delete to authenticated
  using (
    exists (
      select 1 from public.sales sale
      where sale.id = sale_id
        and (sale.created_by = (select auth.uid()) or public.current_user_is_admin())
    )
  );

drop policy if exists "Authenticated can view presence" on public.user_presence;
create policy "Users can view own presence or admins can view presence"
  on public.user_presence
  for select
  using ((select auth.uid()) = user_id or public.current_user_is_admin());

drop policy if exists "Authenticated users can receive browser active presence"
on realtime.messages;
drop policy if exists "Authenticated users can publish browser active presence"
on realtime.messages;
create policy "Users can receive their own browser active presence"
  on realtime.messages
  for select
  to authenticated
  using (
    extension = 'presence'
    and realtime.topic() = 'browser-active:' || auth.uid()::text
  );
create policy "Users can publish their own browser active presence"
  on realtime.messages
  for insert
  to authenticated
  with check (
    extension = 'presence'
    and realtime.topic() = 'browser-active:' || auth.uid()::text
  );

create or replace function public.get_user_presence(
  p_user_id uuid
) returns public.user_presence
language plpgsql
security invoker
set search_path = public
as $function$
declare
  result public.user_presence;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_user_id <> auth.uid() and not public.current_user_is_admin() then
    return null;
  end if;

  select up.*
  into result
  from public.user_presence up
  where up.user_id = p_user_id
  limit 1;

  return result;
end;
$function$;

create or replace function public.list_active_user_presence_since(
  p_since timestamptz
) returns setof public.user_presence
language plpgsql
security invoker
set search_path = public
as $function$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select up.*
  from public.user_presence up
  where up.is_online = true
    and up.last_seen >= p_since
    and (up.user_id = auth.uid() or public.current_user_is_admin())
  order by up.last_seen desc, up.user_id asc;
end;
$function$;

create or replace function public.list_chat_directory_users(
  p_limit integer default 31,
  p_offset integer default 0
) returns table (
  id uuid,
  name character varying,
  email character varying,
  profilephoto text,
  profilephoto_thumb text
)
language plpgsql
security invoker
set search_path = public
as $function$
declare
  requester_id uuid := auth.uid();
  normalized_limit integer := greatest(1, least(coalesce(p_limit, 31), 101));
  normalized_offset integer := greatest(0, coalesce(p_offset, 0));
begin
  if requester_id is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    user_row.id,
    user_row.name,
    user_row.email,
    user_row.profilephoto,
    user_row.profilephoto_thumb
  from public.users user_row
  where user_row.id = requester_id
    or public.current_user_is_admin()
    or exists (
      select 1
      from public.chat_messages chat_message
      where (
        chat_message.sender_id = requester_id
        and chat_message.receiver_id = user_row.id
      )
      or (
        chat_message.receiver_id = requester_id
        and chat_message.sender_id = user_row.id
      )
    )
  order by user_row.name asc, user_row.id asc
  offset normalized_offset
  limit normalized_limit;
end;
$function$;

create or replace function public.get_dashboard_summary()
returns table(
  total_sales numeric,
  total_purchases numeric,
  total_medicines bigint,
  low_stock_count bigint,
  current_month_sales numeric,
  previous_month_sales numeric
)
language plpgsql
security invoker
set search_path = public
as $function$
declare
  current_month_start timestamptz := date_trunc('month', now());
  previous_month_start timestamptz :=
    date_trunc('month', now()) - interval '1 month';
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  return query
  select
    coalesce((select sum(sale.total) from public.sales sale), 0)::numeric,
    coalesce((select sum(purchase.total) from public.purchases purchase), 0)::numeric,
    (select count(*) from public.items)::bigint,
    (select count(*) from public.items where stock < 10)::bigint,
    coalesce(
      (
        select sum(sale.total)
        from public.sales sale
        where sale.date >= current_month_start
          and sale.date < current_month_start + interval '1 month'
      ),
      0
    )::numeric,
    coalesce(
      (
        select sum(sale.total)
        from public.sales sale
        where sale.date >= previous_month_start
          and sale.date < current_month_start
      ),
      0
    )::numeric;
end;
$function$;

create or replace function public.process_purchase_v2(
  p_supplier_id uuid,
  p_invoice_number character varying,
  p_date date,
  p_total numeric,
  p_payment_status character varying,
  p_payment_method character varying,
  p_notes text,
  p_due_date date,
  p_vat_amount numeric,
  p_vat_percentage numeric,
  p_is_vat_included boolean,
  p_customer_name character varying,
  p_customer_address text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $function$
declare
  purchase_id uuid;
  item_record jsonb;
  v_item_id uuid;
  v_quantity numeric;
  v_price numeric;
  v_subtotal numeric;
  v_discount numeric;
  v_vat_percentage numeric;
  v_batch_no text;
  v_expiry_date date;
  v_unit text;
  v_unit_id uuid;
  v_inventory_unit_id uuid;
  v_unit_conversion_rate numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into purchases (
    supplier_id, invoice_number, date, total, payment_status, payment_method,
    notes, due_date, vat_amount, vat_percentage, is_vat_included,
    customer_name, customer_address, created_by
  ) values (
    p_supplier_id, p_invoice_number, p_date, p_total, p_payment_status,
    p_payment_method, p_notes, p_due_date, p_vat_amount, p_vat_percentage,
    p_is_vat_included, p_customer_name, p_customer_address, auth.uid()
  )
  returning id into purchase_id;

  for item_record in select * from jsonb_array_elements(p_items) loop
    v_item_id := (item_record->>'item_id')::uuid;
    v_quantity := coalesce((item_record->>'quantity')::numeric, 0);
    v_price := coalesce((item_record->>'price')::numeric, 0);
    v_subtotal := coalesce((item_record->>'subtotal')::numeric, 0);
    v_discount := coalesce((item_record->>'discount')::numeric, 0);
    v_vat_percentage := coalesce((item_record->>'vat_percentage')::numeric, 0);
    v_batch_no := nullif(item_record->>'batch_no', '');
    v_expiry_date := nullif(item_record->>'expiry_date', '')::date;
    v_unit := nullif(item_record->>'unit', '');
    v_unit_id := nullif(item_record->>'unit_id', '')::uuid;
    v_inventory_unit_id := nullif(item_record->>'inventory_unit_id', '')::uuid;

    select hierarchy.factor_to_base
    into v_unit_conversion_rate
    from public.item_unit_hierarchy hierarchy
    where hierarchy.item_id = v_item_id
      and hierarchy.inventory_unit_id = coalesce(v_inventory_unit_id, v_unit_id)
    limit 1;

    if coalesce(v_inventory_unit_id, v_unit_id) is not null and v_unit_conversion_rate is null then
      raise exception 'Invalid inventory unit for item %', v_item_id;
    end if;

    v_unit_conversion_rate := coalesce(v_unit_conversion_rate, 1);

    insert into purchase_items (
      purchase_id, item_id, quantity, price, subtotal, discount,
      vat_percentage, batch_no, expiry_date, unit, unit_id,
      inventory_unit_id, unit_conversion_rate
    ) values (
      purchase_id, v_item_id, v_quantity::integer, v_price, v_subtotal,
      v_discount, v_vat_percentage, v_batch_no, v_expiry_date, v_unit,
      v_unit_id, coalesce(v_inventory_unit_id, v_unit_id), v_unit_conversion_rate
    );

    update items
      set stock = coalesce(stock, 0) + (v_quantity * v_unit_conversion_rate)
    where id = v_item_id;
  end loop;

  return purchase_id;
end;
$function$;

create or replace function public.process_sale_v1(
  p_patient_id uuid,
  p_doctor_id uuid,
  p_customer_id uuid,
  p_invoice_number character varying,
  p_date date,
  p_total numeric,
  p_payment_method character varying,
  p_created_by uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $function$
declare
  sale_id uuid;
  item_record jsonb;
  v_item_id uuid;
  v_quantity numeric;
  v_price numeric;
  v_subtotal numeric;
  v_unit_name text;
  v_unit_id uuid;
  v_inventory_unit_id uuid;
  v_unit_conversion_rate numeric;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into sales (
    patient_id, doctor_id, customer_id, invoice_number, date, total,
    payment_method, created_by
  ) values (
    p_patient_id, p_doctor_id, p_customer_id, p_invoice_number, p_date,
    p_total, p_payment_method, auth.uid()
  )
  returning id into sale_id;

  for item_record in select * from jsonb_array_elements(p_items) loop
    v_item_id := (item_record->>'item_id')::uuid;
    v_quantity := coalesce((item_record->>'quantity')::numeric, 0);
    v_price := coalesce((item_record->>'price')::numeric, 0);
    v_subtotal := coalesce((item_record->>'subtotal')::numeric, 0);
    v_unit_name := nullif(item_record->>'unit_name', '');
    v_unit_id := nullif(item_record->>'unit_id', '')::uuid;
    v_inventory_unit_id := nullif(item_record->>'inventory_unit_id', '')::uuid;

    select hierarchy.factor_to_base
    into v_unit_conversion_rate
    from public.item_unit_hierarchy hierarchy
    where hierarchy.item_id = v_item_id
      and hierarchy.inventory_unit_id = coalesce(v_inventory_unit_id, v_unit_id)
    limit 1;

    if coalesce(v_inventory_unit_id, v_unit_id) is not null and v_unit_conversion_rate is null then
      raise exception 'Invalid inventory unit for item %', v_item_id;
    end if;

    v_unit_conversion_rate := coalesce(v_unit_conversion_rate, 1);

    insert into sale_items (
      sale_id, item_id, quantity, price, subtotal, unit_name, unit_id,
      inventory_unit_id, unit_conversion_rate
    ) values (
      sale_id, v_item_id, v_quantity::integer, v_price, v_subtotal,
      v_unit_name, v_unit_id, coalesce(v_inventory_unit_id, v_unit_id),
      v_unit_conversion_rate
    );

    update items
      set stock = coalesce(stock, 0) - (v_quantity * v_unit_conversion_rate)
    where id = v_item_id;
  end loop;

  return sale_id;
end;
$function$;

revoke all on function public.process_purchase_v2(uuid, character varying, date, numeric, character varying, character varying, text, date, numeric, numeric, boolean, character varying, text, jsonb) from public;
revoke all on function public.process_purchase_v2(uuid, character varying, date, numeric, character varying, character varying, text, date, numeric, numeric, boolean, character varying, text, jsonb) from anon;
grant execute on function public.process_purchase_v2(uuid, character varying, date, numeric, character varying, character varying, text, date, numeric, numeric, boolean, character varying, text, jsonb) to authenticated;
grant execute on function public.process_purchase_v2(uuid, character varying, date, numeric, character varying, character varying, text, date, numeric, numeric, boolean, character varying, text, jsonb) to service_role;

revoke all on function public.process_sale_v1(uuid, uuid, uuid, character varying, date, numeric, character varying, uuid, jsonb) from public;
revoke all on function public.process_sale_v1(uuid, uuid, uuid, character varying, date, numeric, character varying, uuid, jsonb) from anon;
grant execute on function public.process_sale_v1(uuid, uuid, uuid, character varying, date, numeric, character varying, uuid, jsonb) to authenticated;
grant execute on function public.process_sale_v1(uuid, uuid, uuid, character varying, date, numeric, character varying, uuid, jsonb) to service_role;

revoke all on function public.delete_purchase_with_stock_restore(uuid) from public;
revoke all on function public.delete_purchase_with_stock_restore(uuid) from anon;
grant execute on function public.delete_purchase_with_stock_restore(uuid) to authenticated;
grant execute on function public.delete_purchase_with_stock_restore(uuid) to service_role;

revoke all on function public.delete_sale_with_stock_restore(uuid) from public;
revoke all on function public.delete_sale_with_stock_restore(uuid) from anon;
grant execute on function public.delete_sale_with_stock_restore(uuid) to authenticated;
grant execute on function public.delete_sale_with_stock_restore(uuid) to service_role;

commit;
