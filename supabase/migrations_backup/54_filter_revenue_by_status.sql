-- Migration pour filtrer le chiffre d'affaires par statut des commandes
-- Ne compter que les commandes confirmées, prêtes et terminées

create or replace function get_orders_metrics(p_shop_id uuid)
returns json
language plpgsql
as $$
declare
  result json;
  one_week_ago timestamp;
  one_month_ago timestamp;
  three_months_ago timestamp;
  one_year_ago timestamp;
begin
  -- Calculate date ranges
  one_week_ago := current_timestamp - interval '7 days';
  one_month_ago := current_timestamp - interval '30 days';
  three_months_ago := current_timestamp - interval '90 days';
  one_year_ago := current_timestamp - interval '365 days';
  
  select json_build_object(
    'recent_orders', (
      select json_agg(
        json_build_object(
          'id', o.id,
          'created_at', o.created_at,
          'total_amount', o.total_amount,
          'status', o.status,
          'customer_name', o.customer_name,
          'customer_email', o.customer_email,
          'product_name', o.product_name
        )
      )
      from (
        select id, created_at, total_amount, status, customer_name, customer_email, product_name
        from orders o
        where o.shop_id = p_shop_id
        order by o.created_at desc
        limit 3
      ) o
    ),
    'weekly_count', (
      select count(*)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_week_ago
    ),
    'monthly_count', (
      select count(*)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_month_ago
    ),
    'three_months_count', (
      select count(*)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= three_months_ago
    ),
    'yearly_count', (
      select count(*)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_year_ago
    ),
    -- ✅ REVENUS : seulement les commandes confirmées, prêtes ou terminées
    'weekly_revenue', (
      select coalesce(sum(o.total_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_week_ago
      and o.status in ('confirmed', 'ready', 'completed')
    ),
    'monthly_revenue', (
      select coalesce(sum(o.total_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_month_ago
      and o.status in ('confirmed', 'ready', 'completed')
    ),
    'three_months_revenue', (
      select coalesce(sum(o.total_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= three_months_ago
      and o.status in ('confirmed', 'ready', 'completed')
    ),
    'yearly_revenue', (
      select coalesce(sum(o.total_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_year_ago
      and o.status in ('confirmed', 'ready', 'completed')
    ),
    -- ✅ DÉPÔTS : seulement les commandes confirmées, prêtes ou terminées
    'weekly_deposit', (
      select coalesce(sum(o.paid_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_week_ago
      and o.status in ('confirmed', 'ready', 'completed')
    ),
    'monthly_deposit', (
      select coalesce(sum(o.paid_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_month_ago
      and o.status in ('confirmed', 'ready', 'completed')
    ),
    'three_months_deposit', (
      select coalesce(sum(o.paid_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= three_months_ago
      and o.status in ('confirmed', 'ready', 'completed')
    ),
    'yearly_deposit', (
      select coalesce(sum(o.paid_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_year_ago
      and o.status in ('confirmed', 'ready', 'completed')
    )
  ) into result;
  
  return result;
end;
$$;
