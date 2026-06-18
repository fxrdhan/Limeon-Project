begin;

create index if not exists idx_chat_messages_receiver_id
  on public.chat_messages (receiver_id);

create index if not exists idx_chat_messages_reply_to_id
  on public.chat_messages (reply_to_id);

create index if not exists idx_chat_shared_links_message_id
  on public.chat_shared_links (message_id);

create index if not exists idx_customers_person_id
  on public.customers (person_id);

create index if not exists idx_item_inventory_units_source_dosage_id
  on public.item_inventory_units (source_dosage_id);

create index if not exists idx_item_inventory_units_source_package_id
  on public.item_inventory_units (source_package_id);

create index if not exists idx_items_measurement_denominator_unit_id
  on public.items (measurement_denominator_unit_id);

create index if not exists idx_items_measurement_unit_id
  on public.items (measurement_unit_id);

create index if not exists idx_patients_person_id
  on public.patients (person_id);

create index if not exists idx_purchase_items_unit_id
  on public.purchase_items (unit_id);

create index if not exists idx_sale_items_unit_id
  on public.sale_items (unit_id);

drop index if exists public.customer_level_discounts_item_level_key;

alter policy "Users can publish their own browser active presence"
  on realtime.messages
  with check (
    extension = 'presence'
    and realtime.topic() = ('browser-active:' || ((select auth.uid())::text))
  );

alter policy "Users can receive their own browser active presence"
  on realtime.messages
  using (
    extension = 'presence'
    and realtime.topic() = ('browser-active:' || ((select auth.uid())::text))
  );

commit;
