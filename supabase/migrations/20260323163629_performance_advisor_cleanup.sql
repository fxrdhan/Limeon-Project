-- Fix deterministic performance advisor issues:
-- 1. RLS policies that re-evaluate auth functions per row.
-- 2. Foreign keys without covering indexes.

-- chat_messages
drop policy if exists "Users can delete their own messages" on public.chat_messages;
drop policy if exists "Users can insert their own messages" on public.chat_messages;
drop policy if exists "Users can view their own messages" on public.chat_messages;

create policy "Users can delete their own messages"
  on public.chat_messages
  for delete
  to public
  using (sender_id = (select auth.uid()));

create policy "Users can insert their own messages"
  on public.chat_messages
  for insert
  to public
  with check (sender_id = (select auth.uid()));

create policy "Users can view their own messages"
  on public.chat_messages
  for select
  to public
  using (
    sender_id = (select auth.uid())
    or receiver_id = (select auth.uid())
  );

-- chat_storage_cleanup_failures
drop policy if exists "Users can view their own chat cleanup failures"
  on public.chat_storage_cleanup_failures;

create policy "Users can view their own chat cleanup failures"
  on public.chat_storage_cleanup_failures
  for select
  to authenticated
  using (requested_by = (select auth.uid()));

-- customers
drop policy if exists "Authenticated can delete customers" on public.customers;
drop policy if exists "Authenticated can insert customers" on public.customers;
drop policy if exists "Authenticated can update customers" on public.customers;
drop policy if exists "Authenticated can view customers" on public.customers;

create policy "Authenticated can delete customers"
  on public.customers
  for delete
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Authenticated can insert customers"
  on public.customers
  for insert
  to public
  with check ((select auth.role()) = 'authenticated');

create policy "Authenticated can update customers"
  on public.customers
  for update
  to public
  using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');

create policy "Authenticated can view customers"
  on public.customers
  for select
  to public
  using ((select auth.role()) = 'authenticated');

-- item_categories
drop policy if exists "Allow authenticated users to delete categories" on public.item_categories;
drop policy if exists "Allow authenticated users to insert categories" on public.item_categories;
drop policy if exists "Allow authenticated users to update categories" on public.item_categories;
drop policy if exists "Allow authenticated users to view categories" on public.item_categories;

create policy "Allow authenticated users to delete categories"
  on public.item_categories
  for delete
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to insert categories"
  on public.item_categories
  for insert
  to public
  with check ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to update categories"
  on public.item_categories
  for update
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to view categories"
  on public.item_categories
  for select
  to public
  using ((select auth.role()) = 'authenticated');

-- item_dosages
drop policy if exists "Allow authenticated users to delete dosages" on public.item_dosages;
drop policy if exists "Allow authenticated users to insert dosages" on public.item_dosages;
drop policy if exists "Allow authenticated users to update dosages" on public.item_dosages;
drop policy if exists "Allow authenticated users to view dosages" on public.item_dosages;

create policy "Allow authenticated users to delete dosages"
  on public.item_dosages
  for delete
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to insert dosages"
  on public.item_dosages
  for insert
  to public
  with check ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to update dosages"
  on public.item_dosages
  for update
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to view dosages"
  on public.item_dosages
  for select
  to public
  using ((select auth.role()) = 'authenticated');

-- item_manufacturers
drop policy if exists "Allow authenticated users to delete manufacturers" on public.item_manufacturers;
drop policy if exists "Allow authenticated users to insert manufacturers" on public.item_manufacturers;
drop policy if exists "Allow authenticated users to update manufacturers" on public.item_manufacturers;
drop policy if exists "Allow authenticated users to view manufacturers" on public.item_manufacturers;

create policy "Allow authenticated users to delete manufacturers"
  on public.item_manufacturers
  for delete
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to insert manufacturers"
  on public.item_manufacturers
  for insert
  to public
  with check ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to update manufacturers"
  on public.item_manufacturers
  for update
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to view manufacturers"
  on public.item_manufacturers
  for select
  to public
  using ((select auth.role()) = 'authenticated');

-- item_packages
drop policy if exists "Allow authenticated users to delete packages" on public.item_packages;
drop policy if exists "Allow authenticated users to insert packages" on public.item_packages;
drop policy if exists "Allow authenticated users to update packages" on public.item_packages;
drop policy if exists "Allow authenticated users to view packages" on public.item_packages;

create policy "Allow authenticated users to delete packages"
  on public.item_packages
  for delete
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to insert packages"
  on public.item_packages
  for insert
  to public
  with check ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to update packages"
  on public.item_packages
  for update
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to view packages"
  on public.item_packages
  for select
  to public
  using ((select auth.role()) = 'authenticated');

-- item_types
drop policy if exists "Allow authenticated users to delete types" on public.item_types;
drop policy if exists "Allow authenticated users to insert types" on public.item_types;
drop policy if exists "Allow authenticated users to update types" on public.item_types;
drop policy if exists "Allow authenticated users to view types" on public.item_types;

create policy "Allow authenticated users to delete types"
  on public.item_types
  for delete
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to insert types"
  on public.item_types
  for insert
  to public
  with check ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to update types"
  on public.item_types
  for update
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to view types"
  on public.item_types
  for select
  to public
  using ((select auth.role()) = 'authenticated');

-- item_units
drop policy if exists "Allow authenticated users to delete units" on public.item_units;
drop policy if exists "Allow authenticated users to insert units" on public.item_units;
drop policy if exists "Allow authenticated users to update units" on public.item_units;
drop policy if exists "Allow authenticated users to view units" on public.item_units;

create policy "Allow authenticated users to delete units"
  on public.item_units
  for delete
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to insert units"
  on public.item_units
  for insert
  to public
  with check ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to update units"
  on public.item_units
  for update
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to view units"
  on public.item_units
  for select
  to public
  using ((select auth.role()) = 'authenticated');

-- items
drop policy if exists "Allow authenticated users to delete items" on public.items;
drop policy if exists "Allow authenticated users to insert items" on public.items;
drop policy if exists "Allow authenticated users to update items" on public.items;
drop policy if exists "Allow authenticated users to view items" on public.items;

create policy "Allow authenticated users to delete items"
  on public.items
  for delete
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to insert items"
  on public.items
  for insert
  to public
  with check ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to update items"
  on public.items
  for update
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Allow authenticated users to view items"
  on public.items
  for select
  to public
  using ((select auth.role()) = 'authenticated');

-- purchase_items
drop policy if exists "Authenticated can delete purchase items" on public.purchase_items;
drop policy if exists "Authenticated can insert purchase items" on public.purchase_items;
drop policy if exists "Authenticated can update purchase items" on public.purchase_items;
drop policy if exists "Authenticated can view purchase items" on public.purchase_items;

create policy "Authenticated can delete purchase items"
  on public.purchase_items
  for delete
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Authenticated can insert purchase items"
  on public.purchase_items
  for insert
  to public
  with check ((select auth.role()) = 'authenticated');

create policy "Authenticated can update purchase items"
  on public.purchase_items
  for update
  to public
  using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');

create policy "Authenticated can view purchase items"
  on public.purchase_items
  for select
  to public
  using ((select auth.role()) = 'authenticated');

-- purchases
drop policy if exists "Authenticated can delete purchases" on public.purchases;
drop policy if exists "Authenticated can insert purchases" on public.purchases;
drop policy if exists "Authenticated can update purchases" on public.purchases;
drop policy if exists "Authenticated can view purchases" on public.purchases;

create policy "Authenticated can delete purchases"
  on public.purchases
  for delete
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Authenticated can insert purchases"
  on public.purchases
  for insert
  to public
  with check ((select auth.role()) = 'authenticated');

create policy "Authenticated can update purchases"
  on public.purchases
  for update
  to public
  using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');

create policy "Authenticated can view purchases"
  on public.purchases
  for select
  to public
  using ((select auth.role()) = 'authenticated');

-- suppliers
drop policy if exists "Allow authenticated users to read suppliers" on public.suppliers;
drop policy if exists "Authenticated can delete suppliers" on public.suppliers;
drop policy if exists "Authenticated can insert suppliers" on public.suppliers;
drop policy if exists "Authenticated can update suppliers" on public.suppliers;

create policy "Allow authenticated users to read suppliers"
  on public.suppliers
  for select
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Authenticated can delete suppliers"
  on public.suppliers
  for delete
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Authenticated can insert suppliers"
  on public.suppliers
  for insert
  to public
  with check ((select auth.role()) = 'authenticated');

create policy "Authenticated can update suppliers"
  on public.suppliers
  for update
  to public
  using ((select auth.role()) = 'authenticated')
  with check ((select auth.role()) = 'authenticated');

-- user_preferences
drop policy if exists "Users can delete their own preferences" on public.user_preferences;
drop policy if exists "Users can insert their own preferences" on public.user_preferences;
drop policy if exists "Users can update their own preferences" on public.user_preferences;
drop policy if exists "Users can view their own preferences" on public.user_preferences;

create policy "Users can delete their own preferences"
  on public.user_preferences
  for delete
  to public
  using ((select auth.uid()) = user_id);

create policy "Users can insert their own preferences"
  on public.user_preferences
  for insert
  to public
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own preferences"
  on public.user_preferences
  for update
  to public
  using ((select auth.uid()) = user_id);

create policy "Users can view their own preferences"
  on public.user_preferences
  for select
  to public
  using ((select auth.uid()) = user_id);

-- user_presence
drop policy if exists "Authenticated can view presence" on public.user_presence;
drop policy if exists "Users can delete their presence" on public.user_presence;
drop policy if exists "Users can insert their presence" on public.user_presence;
drop policy if exists "Users can update their presence" on public.user_presence;

create policy "Authenticated can view presence"
  on public.user_presence
  for select
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Users can delete their presence"
  on public.user_presence
  for delete
  to public
  using ((select auth.uid()) = user_id);

create policy "Users can insert their presence"
  on public.user_presence
  for insert
  to public
  with check ((select auth.uid()) = user_id);

create policy "Users can update their presence"
  on public.user_presence
  for update
  to public
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- users
drop policy if exists "Authenticated can read users" on public.users;
drop policy if exists "Users can delete own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;

create policy "Authenticated can read users"
  on public.users
  for select
  to public
  using ((select auth.role()) = 'authenticated');

create policy "Users can delete own profile"
  on public.users
  for delete
  to public
  using ((select auth.uid()) = id);

create policy "Users can insert own profile"
  on public.users
  for insert
  to public
  with check ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.users
  for update
  to public
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Missing foreign key indexes
create index if not exists idx_e_invoice_items_invoice_id
  on public.e_invoice_items (invoice_id);

create index if not exists idx_entity_history_changed_by
  on public.entity_history (changed_by);

create index if not exists idx_items_package_id
  on public.items (package_id);

create index if not exists idx_items_category_id
  on public.items (category_id);

create index if not exists idx_items_type_id
  on public.items (type_id);

create index if not exists idx_purchase_items_item_id
  on public.purchase_items (item_id);

create index if not exists idx_purchase_items_purchase_id
  on public.purchase_items (purchase_id);

create index if not exists idx_purchases_created_by
  on public.purchases (created_by);

create index if not exists idx_purchases_supplier_id
  on public.purchases (supplier_id);

create index if not exists idx_sale_items_item_id
  on public.sale_items (item_id);

create index if not exists idx_sale_items_sale_id
  on public.sale_items (sale_id);

create index if not exists idx_sales_created_by
  on public.sales (created_by);

create index if not exists idx_sales_customer_id
  on public.sales (customer_id);

create index if not exists idx_sales_doctor_id
  on public.sales (doctor_id);

create index if not exists idx_sales_patient_id
  on public.sales (patient_id);
