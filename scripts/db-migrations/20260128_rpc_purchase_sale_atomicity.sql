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
) returns uuid
language plpgsql
set search_path = public
as $$
DECLARE
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
  v_base_unit text;
  v_conversions jsonb;
  v_conversion_rate numeric;
  v_quantity_base numeric;
BEGIN
  insert into purchases (
    supplier_id,
    invoice_number,
    date,
    total,
    payment_status,
    payment_method,
    notes,
    due_date,
    vat_amount,
    vat_percentage,
    is_vat_included,
    customer_name,
    customer_address
  ) values (
    p_supplier_id,
    p_invoice_number,
    p_date,
    p_total,
    p_payment_status,
    p_payment_method,
    p_notes,
    p_due_date,
    p_vat_amount,
    p_vat_percentage,
    p_is_vat_included,
    p_customer_name,
    p_customer_address
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

    insert into purchase_items (
      purchase_id,
      item_id,
      quantity,
      price,
      subtotal,
      discount,
      vat_percentage,
      batch_no,
      expiry_date,
      unit
    ) values (
      purchase_id,
      v_item_id,
      v_quantity::integer,
      v_price,
      v_subtotal,
      v_discount,
      v_vat_percentage,
      v_batch_no,
      v_expiry_date,
      v_unit
    );

    select base_unit, package_conversions
      into v_base_unit, v_conversions
    from items
    where id = v_item_id;

    v_quantity_base := v_quantity;

    if v_unit is not null
       and v_base_unit is not null
       and v_unit <> v_base_unit
       and v_conversions is not null then
      select (conv->>'conversion_rate')::numeric
        into v_conversion_rate
      from jsonb_array_elements(v_conversions) conv
      where conv->>'unit_name' = v_unit
      limit 1;

      if v_conversion_rate is not null and v_conversion_rate <> 0 then
        v_quantity_base := v_quantity / v_conversion_rate;
      end if;
    end if;

    update items
      set stock = coalesce(stock, 0) + v_quantity_base
    where id = v_item_id;
  end loop;

  return purchase_id;
end;
$$;

create or replace function public.delete_purchase_with_stock_restore(
  p_purchase_id uuid
) returns void
language plpgsql
set search_path = public
as $$
DECLARE
  rec record;
  v_base_unit text;
  v_conversions jsonb;
  v_conversion_rate numeric;
  v_quantity_base numeric;
BEGIN
  for rec in
    select item_id, quantity, unit
    from purchase_items
    where purchase_id = p_purchase_id
  loop
    select base_unit, package_conversions
      into v_base_unit, v_conversions
    from items
    where id = rec.item_id;

    v_quantity_base := rec.quantity;

    if rec.unit is not null
       and v_base_unit is not null
       and rec.unit <> v_base_unit
       and v_conversions is not null then
      select (conv->>'conversion_rate')::numeric
        into v_conversion_rate
      from jsonb_array_elements(v_conversions) conv
      where conv->>'unit_name' = rec.unit
      limit 1;

      if v_conversion_rate is not null and v_conversion_rate <> 0 then
        v_quantity_base := rec.quantity / v_conversion_rate;
      end if;
    end if;

    update items
      set stock = greatest(coalesce(stock, 0) - v_quantity_base, 0)
    where id = rec.item_id;
  end loop;

  delete from purchase_items where purchase_id = p_purchase_id;
  delete from purchases where id = p_purchase_id;
end;
$$;

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
) returns uuid
language plpgsql
set search_path = public
as $$
DECLARE
  sale_id uuid;
  item_record jsonb;
  v_item_id uuid;
  v_quantity numeric;
  v_price numeric;
  v_subtotal numeric;
  v_unit_name text;
BEGIN
  insert into sales (
    patient_id,
    doctor_id,
    customer_id,
    invoice_number,
    date,
    total,
    payment_method,
    created_by
  ) values (
    p_patient_id,
    p_doctor_id,
    p_customer_id,
    p_invoice_number,
    p_date,
    p_total,
    p_payment_method,
    p_created_by
  )
  returning id into sale_id;

  for item_record in select * from jsonb_array_elements(p_items) loop
    v_item_id := (item_record->>'item_id')::uuid;
    v_quantity := coalesce((item_record->>'quantity')::numeric, 0);
    v_price := coalesce((item_record->>'price')::numeric, 0);
    v_subtotal := coalesce((item_record->>'subtotal')::numeric, 0);
    v_unit_name := nullif(item_record->>'unit_name', '');

    insert into sale_items (
      sale_id,
      item_id,
      quantity,
      price,
      subtotal,
      unit_name
    ) values (
      sale_id,
      v_item_id,
      v_quantity::integer,
      v_price,
      v_subtotal,
      v_unit_name
    );

    update items
      set stock = coalesce(stock, 0) - v_quantity
    where id = v_item_id;
  end loop;

  return sale_id;
end;
$$;

create or replace function public.delete_sale_with_stock_restore(
  p_sale_id uuid
) returns void
language plpgsql
set search_path = public
as $$
DECLARE
  rec record;
BEGIN
  for rec in
    select item_id, quantity
    from sale_items
    where sale_id = p_sale_id
  loop
    update items
      set stock = coalesce(stock, 0) + rec.quantity
    where id = rec.item_id;
  end loop;

  delete from sale_items where sale_id = p_sale_id;
  delete from sales where id = p_sale_id;
end;
$$;
