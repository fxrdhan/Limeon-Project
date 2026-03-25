-- Tighten remaining permissive public/authenticated policies without changing
-- the current internal-app access model.

-- company_profiles
drop policy if exists authenticated_delete on public.company_profiles;
drop policy if exists authenticated_insert on public.company_profiles;
drop policy if exists authenticated_select on public.company_profiles;
drop policy if exists authenticated_update on public.company_profiles;
drop policy if exists "Authenticated can view company profiles" on public.company_profiles;
drop policy if exists "Authenticated can insert company profiles" on public.company_profiles;
drop policy if exists "Authenticated can update company profiles" on public.company_profiles;
drop policy if exists "Authenticated can delete company profiles" on public.company_profiles;

create policy "Authenticated can view company profiles"
  on public.company_profiles
  for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy "Authenticated can insert company profiles"
  on public.company_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "Authenticated can update company profiles"
  on public.company_profiles
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Authenticated can delete company profiles"
  on public.company_profiles
  for delete
  to authenticated
  using ((select auth.uid()) is not null);

-- customer_levels
drop policy if exists authenticated_delete on public.customer_levels;
drop policy if exists authenticated_insert on public.customer_levels;
drop policy if exists authenticated_select on public.customer_levels;
drop policy if exists authenticated_update on public.customer_levels;
drop policy if exists "Allow delete for authenticated users" on public.customer_levels;
drop policy if exists "Allow insert for authenticated users" on public.customer_levels;
drop policy if exists "Allow update for authenticated users" on public.customer_levels;
drop policy if exists "Authenticated can view customer levels" on public.customer_levels;
drop policy if exists "Authenticated can insert customer levels" on public.customer_levels;
drop policy if exists "Authenticated can update customer levels" on public.customer_levels;
drop policy if exists "Authenticated can delete customer levels" on public.customer_levels;

create policy "Authenticated can view customer levels"
  on public.customer_levels
  for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy "Authenticated can insert customer levels"
  on public.customer_levels
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "Authenticated can update customer levels"
  on public.customer_levels
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Authenticated can delete customer levels"
  on public.customer_levels
  for delete
  to authenticated
  using ((select auth.uid()) is not null);

-- customer_level_discounts
drop policy if exists authenticated_delete on public.customer_level_discounts;
drop policy if exists authenticated_insert on public.customer_level_discounts;
drop policy if exists authenticated_select on public.customer_level_discounts;
drop policy if exists authenticated_update on public.customer_level_discounts;
drop policy if exists "Allow authenticated users to select" on public.customer_level_discounts;
drop policy if exists "Allow delete for authenticated users" on public.customer_level_discounts;
drop policy if exists "Allow insert for authenticated users" on public.customer_level_discounts;
drop policy if exists "Allow update for authenticated users" on public.customer_level_discounts;
drop policy if exists "Authenticated can view customer level discounts" on public.customer_level_discounts;
drop policy if exists "Authenticated can insert customer level discounts" on public.customer_level_discounts;
drop policy if exists "Authenticated can update customer level discounts" on public.customer_level_discounts;
drop policy if exists "Authenticated can delete customer level discounts" on public.customer_level_discounts;

create policy "Authenticated can view customer level discounts"
  on public.customer_level_discounts
  for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy "Authenticated can insert customer level discounts"
  on public.customer_level_discounts
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "Authenticated can update customer level discounts"
  on public.customer_level_discounts
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Authenticated can delete customer level discounts"
  on public.customer_level_discounts
  for delete
  to authenticated
  using ((select auth.uid()) is not null);

-- doctors
drop policy if exists authenticated_delete on public.doctors;
drop policy if exists authenticated_insert on public.doctors;
drop policy if exists authenticated_select on public.doctors;
drop policy if exists authenticated_update on public.doctors;
drop policy if exists "Authenticated can view doctors" on public.doctors;
drop policy if exists "Authenticated can insert doctors" on public.doctors;
drop policy if exists "Authenticated can update doctors" on public.doctors;
drop policy if exists "Authenticated can delete doctors" on public.doctors;

create policy "Authenticated can view doctors"
  on public.doctors
  for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy "Authenticated can insert doctors"
  on public.doctors
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "Authenticated can update doctors"
  on public.doctors
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Authenticated can delete doctors"
  on public.doctors
  for delete
  to authenticated
  using ((select auth.uid()) is not null);

-- patients
drop policy if exists authenticated_delete on public.patients;
drop policy if exists authenticated_insert on public.patients;
drop policy if exists authenticated_select on public.patients;
drop policy if exists authenticated_update on public.patients;
drop policy if exists "Allow authenticated users to read patients" on public.patients;
drop policy if exists "Authenticated can view patients" on public.patients;
drop policy if exists "Authenticated can insert patients" on public.patients;
drop policy if exists "Authenticated can update patients" on public.patients;
drop policy if exists "Authenticated can delete patients" on public.patients;

create policy "Authenticated can view patients"
  on public.patients
  for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy "Authenticated can insert patients"
  on public.patients
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "Authenticated can update patients"
  on public.patients
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Authenticated can delete patients"
  on public.patients
  for delete
  to authenticated
  using ((select auth.uid()) is not null);

-- persons
drop policy if exists authenticated_delete on public.persons;
drop policy if exists authenticated_insert on public.persons;
drop policy if exists authenticated_select on public.persons;
drop policy if exists authenticated_update on public.persons;
drop policy if exists "Authenticated can view persons" on public.persons;
drop policy if exists "Authenticated can insert persons" on public.persons;
drop policy if exists "Authenticated can update persons" on public.persons;
drop policy if exists "Authenticated can delete persons" on public.persons;

create policy "Authenticated can view persons"
  on public.persons
  for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy "Authenticated can insert persons"
  on public.persons
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "Authenticated can update persons"
  on public.persons
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Authenticated can delete persons"
  on public.persons
  for delete
  to authenticated
  using ((select auth.uid()) is not null);

-- e_invoices
drop policy if exists authenticated_delete on public.e_invoices;
drop policy if exists authenticated_insert on public.e_invoices;
drop policy if exists authenticated_select on public.e_invoices;
drop policy if exists authenticated_update on public.e_invoices;
drop policy if exists "Allow authenticated users to read invoices" on public.e_invoices;
drop policy if exists "Authenticated can view e invoices" on public.e_invoices;
drop policy if exists "Authenticated can insert e invoices" on public.e_invoices;
drop policy if exists "Authenticated can update e invoices" on public.e_invoices;
drop policy if exists "Authenticated can delete e invoices" on public.e_invoices;

create policy "Authenticated can view e invoices"
  on public.e_invoices
  for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy "Authenticated can insert e invoices"
  on public.e_invoices
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "Authenticated can update e invoices"
  on public.e_invoices
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Authenticated can delete e invoices"
  on public.e_invoices
  for delete
  to authenticated
  using ((select auth.uid()) is not null);

-- e_invoice_items
drop policy if exists authenticated_delete on public.e_invoice_items;
drop policy if exists authenticated_insert on public.e_invoice_items;
drop policy if exists authenticated_select on public.e_invoice_items;
drop policy if exists authenticated_update on public.e_invoice_items;
drop policy if exists "Authenticated can view e invoice items" on public.e_invoice_items;
drop policy if exists "Authenticated can insert e invoice items" on public.e_invoice_items;
drop policy if exists "Authenticated can update e invoice items" on public.e_invoice_items;
drop policy if exists "Authenticated can delete e invoice items" on public.e_invoice_items;

create policy "Authenticated can view e invoice items"
  on public.e_invoice_items
  for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy "Authenticated can insert e invoice items"
  on public.e_invoice_items
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "Authenticated can update e invoice items"
  on public.e_invoice_items
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Authenticated can delete e invoice items"
  on public.e_invoice_items
  for delete
  to authenticated
  using ((select auth.uid()) is not null);

-- sales
drop policy if exists authenticated_delete on public.sales;
drop policy if exists authenticated_insert on public.sales;
drop policy if exists authenticated_select on public.sales;
drop policy if exists authenticated_update on public.sales;
drop policy if exists "Allow authenticated users to select sales" on public.sales;
drop policy if exists "Allow delete sales for authenticated users" on public.sales;
drop policy if exists "Allow insert sales for authenticated users" on public.sales;
drop policy if exists "Allow update sales for authenticated users" on public.sales;
drop policy if exists "Authenticated can insert sales" on public.sales;
drop policy if exists "Authenticated can update sales" on public.sales;
drop policy if exists "Authenticated can delete sales" on public.sales;
drop policy if exists "Authenticated can view sales" on public.sales;

create policy "Authenticated can view sales"
  on public.sales
  for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy "Authenticated can insert sales"
  on public.sales
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "Authenticated can update sales"
  on public.sales
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Authenticated can delete sales"
  on public.sales
  for delete
  to authenticated
  using ((select auth.uid()) is not null);

-- sale_items
drop policy if exists authenticated_delete on public.sale_items;
drop policy if exists authenticated_insert on public.sale_items;
drop policy if exists authenticated_select on public.sale_items;
drop policy if exists authenticated_update on public.sale_items;
drop policy if exists "Allow authenticated users to select sale items" on public.sale_items;
drop policy if exists "Allow delete sale items for authenticated users" on public.sale_items;
drop policy if exists "Allow insert sale items for authenticated users" on public.sale_items;
drop policy if exists "Allow update sale items for authenticated users" on public.sale_items;
drop policy if exists "Authenticated can insert sale items" on public.sale_items;
drop policy if exists "Authenticated can update sale items" on public.sale_items;
drop policy if exists "Authenticated can delete sale items" on public.sale_items;
drop policy if exists "Authenticated can view sale items" on public.sale_items;

create policy "Authenticated can view sale items"
  on public.sale_items
  for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy "Authenticated can insert sale items"
  on public.sale_items
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "Authenticated can update sale items"
  on public.sale_items
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Authenticated can delete sale items"
  on public.sale_items
  for delete
  to authenticated
  using ((select auth.uid()) is not null);

-- entity_history
drop policy if exists authenticated_delete on public.entity_history;
drop policy if exists authenticated_insert on public.entity_history;
drop policy if exists authenticated_select on public.entity_history;
drop policy if exists authenticated_update on public.entity_history;
drop policy if exists "Allow authenticated users to read history" on public.entity_history;
drop policy if exists "Allow authenticated users to insert history" on public.entity_history;
drop policy if exists "Authenticated can view entity history" on public.entity_history;
drop policy if exists "Authenticated can insert entity history" on public.entity_history;
drop policy if exists "Authenticated can update entity history" on public.entity_history;
drop policy if exists "Authenticated can delete entity history" on public.entity_history;

create policy "Authenticated can view entity history"
  on public.entity_history
  for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy "Authenticated can insert entity history"
  on public.entity_history
  for insert
  to authenticated
  with check ((select auth.uid()) is not null);

create policy "Authenticated can update entity history"
  on public.entity_history
  for update
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "Authenticated can delete entity history"
  on public.entity_history
  for delete
  to authenticated
  using ((select auth.uid()) is not null);

-- Logs and metrics are server-managed only.
drop policy if exists authenticated_delete on public.api_metrics;
drop policy if exists authenticated_insert on public.api_metrics;
drop policy if exists authenticated_select on public.api_metrics;
drop policy if exists authenticated_update on public.api_metrics;
drop policy if exists "Allow authenticated users to read metrics" on public.api_metrics;

drop policy if exists authenticated_delete on public.gemini_api_logs;
drop policy if exists authenticated_insert on public.gemini_api_logs;
drop policy if exists authenticated_select on public.gemini_api_logs;
drop policy if exists authenticated_update on public.gemini_api_logs;

-- chat_shared_links is intentionally managed by server-side code only.
drop policy if exists "Service role can manage chat shared links" on public.chat_shared_links;

create policy "Service role can manage chat shared links"
  on public.chat_shared_links
  for all
  to service_role
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
