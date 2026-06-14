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
security definer
set search_path to 'public'
as $$
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
    coalesce((select sum(sale.total) from public.sales sale), 0)::numeric as total_sales,
    coalesce((select sum(purchase.total) from public.purchases purchase), 0)::numeric as total_purchases,
    (select count(*) from public.items)::bigint as total_medicines,
    (select count(*) from public.items where stock < 10)::bigint as low_stock_count,
    coalesce(
      (
        select sum(sale.total)
        from public.sales sale
        where sale.date >= current_month_start
          and sale.date < current_month_start + interval '1 month'
      ),
      0
    )::numeric as current_month_sales,
    coalesce(
      (
        select sum(sale.total)
        from public.sales sale
        where sale.date >= previous_month_start
          and sale.date < current_month_start
      ),
      0
    )::numeric as previous_month_sales;
end;
$$;

revoke all on function public.get_dashboard_summary() from public;
revoke all on function public.get_dashboard_summary() from anon;
revoke all on function public.get_dashboard_summary() from authenticated;
grant execute on function public.get_dashboard_summary() to authenticated;
grant execute on function public.get_dashboard_summary() to service_role;
