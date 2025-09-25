-- Migration: Optimize pastry dashboard database calls
-- Description: Create consolidated functions to reduce DB calls in pastry dashboard

-- Function to get all dashboard data in one call
create or replace function get_dashboard_data(p_profile_id uuid)
returns json
language plpgsql
as $$
declare
  result json;
begin
  select json_build_object(
    'shop', (
      select json_build_object(
        'id', s.id,
        'name', s.name,
        'slug', s.slug,
        'logo_url', s.logo_url,
        'is_custom_accepted', s.is_custom_accepted,
        'is_active', s.is_active
      )
      from shops s
      where s.profile_id = p_profile_id
    ),
    'permissions', get_user_permissions(p_profile_id),
    'subscription', (
      select json_build_object(
        'status', up.subscription_status,
        'stripe_subscription_id', up.stripe_subscription_id,
        'created_at', up.created_at
      )
      from user_products up
      where up.profile_id = p_profile_id
      order by up.created_at desc
      limit 1
    )
  ) into result;
  
  return result;
end;
$$;

-- Function to get user permissions in one call
create or replace function get_user_permissions(p_profile_id uuid)
returns json
language plpgsql
as $$
declare
  result json;
  v_plan text;
  v_product_count integer;
  v_shop_id uuid;
  v_shop_slug text;
begin
  -- Get shop info
  select s.id, s.slug
  into v_shop_id, v_shop_slug
  from shops s
  where s.profile_id = p_profile_id;
  
  -- Get plan and product count
  v_plan := get_user_plan(p_profile_id, 'prod_Selcz36pAfV3vV', 'prod_Selbd3Ne2plHqG');
  v_product_count := get_product_count(p_profile_id);
  
  select json_build_object(
    'shopId', v_shop_id,
    'shopSlug', v_shop_slug,
    'plan', v_plan,
    'productCount', v_product_count,
    'productLimit', case 
      when v_plan = 'premium' then 999999
      when v_plan = 'exempt' then 999999
      else 10
    end,
    'canHandleCustomRequests', v_plan in ('premium', 'exempt'),
    'canManageCustomForms', v_plan in ('premium', 'exempt'),
    'canAddMoreProducts', v_product_count < case 
      when v_plan = 'premium' then 999999
      when v_plan = 'exempt' then 999999
      else 10
    end,
    'needsSubscription', v_plan is null,
    'isExempt', v_plan = 'exempt',
    'canAccessDashboard', v_plan is not null,
    'has_stripe_connect', (
      select count(*) > 0
      from stripe_connect_accounts sca
      where sca.profile_id = p_profile_id
      and sca.is_active = true
    )
  ) into result;
  
  return result;
end;
$$;

-- Function to get products data (products + categories + shop)
create or replace function get_products_data(p_profile_id uuid)
returns json
language plpgsql
as $$
declare
  result json;
begin
  select json_build_object(
    'products', (
      select json_agg(
        json_build_object(
          'id', p.id,
          'name', p.name,
          'description', p.description,
          'base_price', p.base_price,
          'image_url', p.image_url,
          'is_active', p.is_active,
          'created_at', p.created_at,
          'category', json_build_object(
            'id', c.id,
            'name', c.name
          )
        )
      )
      from (
        select p.id, p.name, p.description, p.base_price, p.image_url, p.is_active, p.created_at, p.category_id
        from products p
        join shops s on s.id = p.shop_id
        where s.profile_id = p_profile_id
        order by p.created_at desc
      ) p
      left join categories c on c.id = p.category_id
    ),
    'categories', (
      select json_agg(
        json_build_object(
          'id', c.id,
          'name', c.name
        )
      )
      from (
        select c.id, c.name
        from categories c
        join shops s on s.id = c.shop_id
        where s.profile_id = p_profile_id
        order by c.name
      ) c
    ),
    'shop', (
      select json_build_object(
        'id', s.id,
        'slug', s.slug
      )
      from shops s
      where s.profile_id = p_profile_id
    )
  ) into result;
  
  return result;
end;
$$;

-- Function to get orders data (orders + shop)
create or replace function get_orders_data(p_profile_id uuid)
returns json
language plpgsql
as $$
declare
  result json;
begin
  select json_build_object(
    'orders', (
      select json_agg(
        json_build_object(
          'id', o.id,
          'customer_name', o.customer_name,
          'customer_email', o.customer_email,
          'pickup_date', o.pickup_date,
          'status', o.status,
          'total_amount', o.total_amount,
          'product_name', o.product_name,
          'additional_information', o.additional_information,
          'chef_message', o.chef_message,
          'created_at', o.created_at,
          'chef_pickup_date', o.chef_pickup_date,
          'product', json_build_object(
            'name', p.name,
            'image_url', p.image_url
          )
        )
      )
      from (
        select o.id, o.customer_name, o.customer_email, o.pickup_date, o.status, o.total_amount, o.product_name, o.additional_information, o.chef_message, o.created_at, o.chef_pickup_date, o.product_id
        from orders o
        join shops s on s.id = o.shop_id
        where s.profile_id = p_profile_id
        order by o.pickup_date asc
      ) o
      left join products p on p.id = o.product_id
    ),
    'shop', (
      select json_build_object(
        'id', s.id,
        'name', s.name,
        'slug', s.slug
      )
      from shops s
      where s.profile_id = p_profile_id
    )
  ) into result;
  
  return result;
end;
$$;

-- Function to get availability data (availabilities + unavailabilities)
create or replace function get_availability_data(p_profile_id uuid)
returns json
language plpgsql
as $$
declare
  result json;
begin
  select json_build_object(
    'availabilities', (
      select json_agg(
        json_build_object(
          'id', a.id,
          'day', a.day,
          'is_open', a.is_open,
          'daily_order_limit', a.daily_order_limit
        )
      )
      from (
        select a.id, a.day, a.is_open, a.daily_order_limit
        from availabilities a
        join shops s on s.id = a.shop_id
        where s.profile_id = p_profile_id
        order by a.day
      ) a
    ),
    'unavailabilities', (
      select json_agg(
        json_build_object(
          'id', u.id,
          'start_date', u.start_date,
          'end_date', u.end_date
        )
      )
      from (
        select u.id, u.start_date, u.end_date
        from unavailabilities u
        join shops s on s.id = u.shop_id
        where s.profile_id = p_profile_id
        and u.end_date >= current_date
        order by u.start_date
      ) u
    ),
    'shopId', (
      select s.id
      from shops s
      where s.profile_id = p_profile_id
    )
  ) into result;
  
  return result;
end;
$$;

-- Function to get custom form data (form + fields + shop)
create or replace function get_custom_form_data(p_profile_id uuid)
returns json
language plpgsql
as $$
declare
  result json;
begin
  select json_build_object(
    'shop', (
      select json_build_object(
        'id', s.id,
        'slug', s.slug,
        'is_custom_accepted', s.is_custom_accepted
      )
      from shops s
      where s.profile_id = p_profile_id
    ),
    'customForm', (
      select json_build_object(
        'id', f.id,
        'is_custom_form', f.is_custom_form,
        'title', f.title,
        'description', f.description
      )
      from forms f
      join shops s on s.id = f.shop_id
      where s.profile_id = p_profile_id
      and f.is_custom_form = true
    ),
    'customFields', (
      select json_agg(
        json_build_object(
          'id', ff.id,
          'label', ff.label,
          'type', ff.type,
          'options', ff.options,
          'required', ff.required,
          'order', ff.order
        )
      )
      from form_fields ff
      join forms f on f.id = ff.form_id
      join shops s on s.id = f.shop_id
      where s.profile_id = p_profile_id
      and f.is_custom_form = true
      order by ff.order
    )
  ) into result;
  
  return result;
end;
$$;

-- Function to get FAQ data
create or replace function get_faq_data(p_profile_id uuid)
returns json
language plpgsql
as $$
declare
  result json;
begin
  select json_build_object(
    'faqs', (
      select json_agg(
        json_build_object(
          'id', f.id,
          'question', f.question,
          'answer', f.answer,
          'created_at', f.created_at,
          'updated_at', f.updated_at
        )
      )
      from (
        select f.id, f.question, f.answer, f.created_at, f.updated_at
        from faq f
        join shops s on s.id = f.shop_id
        where s.profile_id = p_profile_id
        order by f.created_at desc
      ) f
    )
  ) into result;
  
  return result;
end;
$$;

-- Function to get order detail data (order + product + shop + personal note)
create or replace function get_order_detail_data(p_order_id uuid, p_profile_id uuid)
returns json
language plpgsql
as $$
declare
  result json;
begin
  select json_build_object(
    'order', (
      select json_build_object(
        'id', o.id,
        'customer_name', o.customer_name,
        'customer_email', o.customer_email,
        'pickup_date', o.pickup_date,
        'status', o.status,
        'total_amount', o.total_amount,
        'product_name', o.product_name,
        'additional_information', o.additional_information,
        'chef_message', o.chef_message,
        'created_at', o.created_at,
        'chef_pickup_date', o.chef_pickup_date,
        'paid_amount', o.paid_amount,
        'stripe_payment_intent_id', o.stripe_payment_intent_id,
        'product', json_build_object(
          'name', p.name,
          'description', p.description,
          'image_url', p.image_url,
          'base_price', p.base_price
        ),
        'shop', json_build_object(
          'name', s.name,
          'slug', s.slug
        )
      )
      from orders o
      left join products p on p.id = o.product_id
      join shops s on s.id = o.shop_id
      where o.id = p_order_id
      and s.profile_id = p_profile_id
    ),
    'personalNote', (
      select json_build_object(
        'note', pon.note,
        'updated_at', pon.updated_at
      )
      from personal_order_notes pon
      join shops s on s.id = pon.shop_id
      where pon.order_id = p_order_id
      and s.profile_id = p_profile_id
    ),
    'shop', (
      select json_build_object(
        'id', s.id,
        'name', s.name,
        'slug', s.slug
      )
      from shops s
      where s.profile_id = p_profile_id
    )
  ) into result;
  
  return result;
end;
$$;

-- Function to get orders metrics for dashboard
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
    'weekly_revenue', (
      select coalesce(sum(o.total_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_week_ago
    ),
    'monthly_revenue', (
      select coalesce(sum(o.total_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_month_ago
    ),
    'three_months_revenue', (
      select coalesce(sum(o.total_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= three_months_ago
    ),
    'yearly_revenue', (
      select coalesce(sum(o.total_amount), 0)
      from orders o
      where o.shop_id = p_shop_id
      and o.created_at >= one_year_ago
    )
  ) into result;
  
  return result;
end;
$$;

-- Grant execute permissions to authenticated users
grant execute on function get_dashboard_data(uuid) to authenticated;
grant execute on function get_user_permissions(uuid) to authenticated;
grant execute on function get_products_data(uuid) to authenticated;
grant execute on function get_orders_data(uuid) to authenticated;
grant execute on function get_availability_data(uuid) to authenticated;
grant execute on function get_custom_form_data(uuid) to authenticated;
grant execute on function get_faq_data(uuid) to authenticated;
grant execute on function get_order_detail_data(uuid, uuid) to authenticated;
grant execute on function get_orders_metrics(uuid) to authenticated;
