-- Tighten overly permissive authenticated policies while keeping current app behavior.

-- chat_messages: drop permissive policies, add delete-own

drop policy if exists authenticated_delete on public.chat_messages;
drop policy if exists authenticated_insert on public.chat_messages;
drop policy if exists authenticated_select on public.chat_messages;
drop policy if exists authenticated_update on public.chat_messages;

drop policy if exists "Users can delete their own messages" on public.chat_messages;
create policy "Users can delete their own messages"
  on public.chat_messages
  for delete
  using (sender_id = auth.uid());

-- user_preferences: keep per-user policies, remove permissive authenticated ones

drop policy if exists authenticated_delete on public.user_preferences;
drop policy if exists authenticated_insert on public.user_preferences;
drop policy if exists authenticated_select on public.user_preferences;
drop policy if exists authenticated_update on public.user_preferences;

-- user_presence: allow read for authenticated, write for own row

drop policy if exists authenticated_delete on public.user_presence;
drop policy if exists authenticated_insert on public.user_presence;
drop policy if exists authenticated_select on public.user_presence;
drop policy if exists authenticated_update on public.user_presence;

drop policy if exists "Authenticated can view presence" on public.user_presence;
create policy "Authenticated can view presence"
  on public.user_presence
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users can insert their presence" on public.user_presence;
create policy "Users can insert their presence"
  on public.user_presence
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their presence" on public.user_presence;
create policy "Users can update their presence"
  on public.user_presence
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their presence" on public.user_presence;
create policy "Users can delete their presence"
  on public.user_presence
  for delete
  using (auth.uid() = user_id);

-- users: allow authenticated read, restrict write to own row

drop policy if exists authenticated_delete on public.users;
drop policy if exists authenticated_insert on public.users;
drop policy if exists authenticated_select on public.users;
drop policy if exists authenticated_update on public.users;

drop policy if exists "Authenticated can read users" on public.users;
create policy "Authenticated can read users"
  on public.users
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
  on public.users
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can delete own profile" on public.users;
create policy "Users can delete own profile"
  on public.users
  for delete
  using (auth.uid() = id);

-- master data + items: remove redundant authenticated_* policies

drop policy if exists authenticated_delete on public.item_categories;
drop policy if exists authenticated_insert on public.item_categories;
drop policy if exists authenticated_select on public.item_categories;
drop policy if exists authenticated_update on public.item_categories;

drop policy if exists authenticated_delete on public.item_types;
drop policy if exists authenticated_insert on public.item_types;
drop policy if exists authenticated_select on public.item_types;
drop policy if exists authenticated_update on public.item_types;

drop policy if exists authenticated_delete on public.item_packages;
drop policy if exists authenticated_insert on public.item_packages;
drop policy if exists authenticated_select on public.item_packages;
drop policy if exists authenticated_update on public.item_packages;

drop policy if exists authenticated_delete on public.item_dosages;
drop policy if exists authenticated_insert on public.item_dosages;
drop policy if exists authenticated_select on public.item_dosages;
drop policy if exists authenticated_update on public.item_dosages;

drop policy if exists authenticated_delete on public.item_units;
drop policy if exists authenticated_insert on public.item_units;
drop policy if exists authenticated_select on public.item_units;
drop policy if exists authenticated_update on public.item_units;

drop policy if exists authenticated_delete on public.items;
drop policy if exists authenticated_insert on public.items;
drop policy if exists authenticated_select on public.items;
drop policy if exists authenticated_update on public.items;

-- item_manufacturers: remove redundant + anon read

drop policy if exists authenticated_delete on public.item_manufacturers;
drop policy if exists authenticated_insert on public.item_manufacturers;
drop policy if exists authenticated_select on public.item_manufacturers;
drop policy if exists authenticated_update on public.item_manufacturers;
drop policy if exists "Allow all operations for authenticated users" on public.item_manufacturers;
drop policy if exists "Allow read access for anon users" on public.item_manufacturers;

-- customers: replace permissive policies with authenticated checks

drop policy if exists authenticated_delete on public.customers;
drop policy if exists authenticated_insert on public.customers;
drop policy if exists authenticated_select on public.customers;
drop policy if exists authenticated_update on public.customers;

drop policy if exists "Authenticated can view customers" on public.customers;
create policy "Authenticated can view customers"
  on public.customers
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated can insert customers" on public.customers;
create policy "Authenticated can insert customers"
  on public.customers
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated can update customers" on public.customers;
create policy "Authenticated can update customers"
  on public.customers
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete customers" on public.customers;
create policy "Authenticated can delete customers"
  on public.customers
  for delete
  using (auth.role() = 'authenticated');

-- suppliers: keep select policy, add authenticated write policies

drop policy if exists authenticated_delete on public.suppliers;
drop policy if exists authenticated_insert on public.suppliers;
drop policy if exists authenticated_select on public.suppliers;
drop policy if exists authenticated_update on public.suppliers;

drop policy if exists "Authenticated can insert suppliers" on public.suppliers;
create policy "Authenticated can insert suppliers"
  on public.suppliers
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated can update suppliers" on public.suppliers;
create policy "Authenticated can update suppliers"
  on public.suppliers
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete suppliers" on public.suppliers;
create policy "Authenticated can delete suppliers"
  on public.suppliers
  for delete
  using (auth.role() = 'authenticated');

-- purchases: replace permissive policies

drop policy if exists authenticated_delete on public.purchases;
drop policy if exists authenticated_insert on public.purchases;
drop policy if exists authenticated_select on public.purchases;
drop policy if exists authenticated_update on public.purchases;

drop policy if exists "Authenticated can view purchases" on public.purchases;
create policy "Authenticated can view purchases"
  on public.purchases
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated can insert purchases" on public.purchases;
create policy "Authenticated can insert purchases"
  on public.purchases
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated can update purchases" on public.purchases;
create policy "Authenticated can update purchases"
  on public.purchases
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete purchases" on public.purchases;
create policy "Authenticated can delete purchases"
  on public.purchases
  for delete
  using (auth.role() = 'authenticated');

-- purchase_items: replace permissive policies

drop policy if exists authenticated_delete on public.purchase_items;
drop policy if exists authenticated_insert on public.purchase_items;
drop policy if exists authenticated_select on public.purchase_items;
drop policy if exists authenticated_update on public.purchase_items;

drop policy if exists "Authenticated can view purchase items" on public.purchase_items;
create policy "Authenticated can view purchase items"
  on public.purchase_items
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated can insert purchase items" on public.purchase_items;
create policy "Authenticated can insert purchase items"
  on public.purchase_items
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated can update purchase items" on public.purchase_items;
create policy "Authenticated can update purchase items"
  on public.purchase_items
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete purchase items" on public.purchase_items;
create policy "Authenticated can delete purchase items"
  on public.purchase_items
  for delete
  using (auth.role() = 'authenticated');

-- sales: keep select policy, add authenticated write policies

drop policy if exists authenticated_delete on public.sales;
drop policy if exists authenticated_insert on public.sales;
drop policy if exists authenticated_select on public.sales;
drop policy if exists authenticated_update on public.sales;

drop policy if exists "Authenticated can insert sales" on public.sales;
create policy "Authenticated can insert sales"
  on public.sales
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated can update sales" on public.sales;
create policy "Authenticated can update sales"
  on public.sales
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete sales" on public.sales;
create policy "Authenticated can delete sales"
  on public.sales
  for delete
  using (auth.role() = 'authenticated');

-- sale_items: keep select policy, add authenticated write policies

drop policy if exists authenticated_delete on public.sale_items;
drop policy if exists authenticated_insert on public.sale_items;
drop policy if exists authenticated_select on public.sale_items;
drop policy if exists authenticated_update on public.sale_items;

drop policy if exists "Authenticated can insert sale items" on public.sale_items;
create policy "Authenticated can insert sale items"
  on public.sale_items
  for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated can update sale items" on public.sale_items;
create policy "Authenticated can update sale items"
  on public.sale_items
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated can delete sale items" on public.sale_items;
create policy "Authenticated can delete sale items"
  on public.sale_items
  for delete
  using (auth.role() = 'authenticated');
