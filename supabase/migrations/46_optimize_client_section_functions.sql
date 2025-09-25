-- Unified function for product or custom order data
create or replace function get_order_data(p_slug text, p_product_id uuid default null)
returns json
language plpgsql
as $$
declare
  result json;
  v_shop_id uuid;
  v_form_id uuid;
  v_dates_with_limit_reached text[];
begin
  -- Get shop ID
  select id into v_shop_id
  from shops
  where slug = p_slug and is_active = true;
  
  if v_shop_id is null then
    return null;
  end if;

  -- If product ID is provided → use its form_id, else use shop's custom form
  if p_product_id is not null then
    select form_id into v_form_id
    from products
    where id = p_product_id
    and shop_id = v_shop_id
    and is_active = true;
  else
    select id into v_form_id
    from forms
    where shop_id = v_shop_id
    and is_custom_form = true
    limit 1;
  end if;

  -- Calculate dates with limit reached (cast fix included)
  with future_dates as (
    select 
      (current_date + (gs * interval '1 day'))::date as check_date,
      extract(dow from (current_date + (gs * interval '1 day'))) as day_of_week
    from generate_series(0, 59) gs
  ),
  availability_days as (
    select day, daily_order_limit
    from availabilities
    where shop_id = v_shop_id
    and is_open = true
    and daily_order_limit is not null
  ),
  future_dates_with_limits as (
    select 
      fd.check_date,
      ad.daily_order_limit
    from future_dates fd
    join availability_days ad on fd.day_of_week = ad.day
  ),
  order_counts as (
    select 
      fdl.check_date::text as pickup_date,
      count(o.id) as order_count,
      fdl.daily_order_limit
    from future_dates_with_limits fdl
    left join orders o on o.shop_id = v_shop_id 
      and o.pickup_date = fdl.check_date::date  -- ✅ cast fix
      and o.status in ('pending', 'quoted', 'confirmed')
    group by fdl.check_date, fdl.daily_order_limit
  )
  select array_agg(pickup_date)
  into v_dates_with_limit_reached
  from order_counts
  where order_count >= daily_order_limit;

  -- Build JSON result
  select json_build_object(
    'shop', (
      select json_build_object(
        'id', s.id,
        'name', s.name,
        'bio', s.bio,
        'slug', s.slug,
        'logo_url', s.logo_url,
        'is_custom_accepted', s.is_custom_accepted,
        'is_active', s.is_active
      )
      from shops s
      where s.id = v_shop_id
    ),
    'product', (
      case when p_product_id is not null then (
        select json_build_object(
          'id', p.id,
          'name', p.name,
          'description', p.description,
          'base_price', p.base_price,
          'form_id', p.form_id,
          'image_url', p.image_url,
          'min_days_notice', p.min_days_notice,
          'category', json_build_object(
            'id', c.id,
            'name', c.name
          )
        )
        from products p
        left join categories c on c.id = p.category_id
        where p.id = p_product_id
        and p.shop_id = v_shop_id
        and p.is_active = true
      ) else null end
    ),
    'customForm', (
      select json_build_object(
        'id', f.id,
        'is_custom_form', f.is_custom_form,
        'title', f.title,
        'description', f.description
      )
      from forms f
      where f.id = v_form_id
      and f.shop_id = v_shop_id
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
        ) order by ff.order
      )
      from form_fields ff
      where ff.form_id = v_form_id
    ),
    'availabilities', (
      select json_agg(
        json_build_object(
          'day', a.day,
          'is_open', a.is_open,
          'daily_order_limit', a.daily_order_limit
        ) order by a.day
      )
      from availabilities a
      where a.shop_id = v_shop_id
    ),
    'unavailabilities', (
      select json_agg(
        json_build_object(
          'id', u.id,
          'start_date', u.start_date,
          'end_date', u.end_date
        ) order by u.start_date
      )
      from unavailabilities u
      where u.shop_id = v_shop_id
      and u.end_date >= current_date
    ),
    'datesWithLimitReached', v_dates_with_limit_reached
  )
  into result;
  
  return result;
end;
$$;


-- Autoriser les utilisateurs authentifiés à exécuter la fonction unifiée
grant execute on function get_order_data(text, uuid) to authenticated;
