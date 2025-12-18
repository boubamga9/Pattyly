-- ==============================================
-- FIX : Supprimer la surcharge de get_order_data
-- ==============================================

-- Supprimer TOUTES les versions possibles
DROP FUNCTION IF EXISTS get_order_data(VARCHAR, UUID);
DROP FUNCTION IF EXISTS get_order_data(TEXT, UUID);
DROP FUNCTION IF EXISTS get_order_data(VARCHAR);
DROP FUNCTION IF EXISTS get_order_data(TEXT);
DROP FUNCTION IF EXISTS get_order_data(CHARACTER VARYING, UUID);
DROP FUNCTION IF EXISTS get_order_data(CHARACTER VARYING);

-- ==============================================
-- Recréer UNE SEULE version propre
-- ==============================================

-- Copie exacte de migration 46, avec ajout de is_visible

CREATE OR REPLACE FUNCTION get_order_data(p_slug TEXT, p_product_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  v_shop_id UUID;
  v_shop_profile_id UUID;
  v_shop_is_active BOOLEAN;
  v_is_shop_visible BOOLEAN;
  v_form_id UUID;
  v_dates_with_limit_reached TEXT[];
BEGIN
  -- Get shop ID and info
  SELECT id, profile_id, is_active 
  INTO v_shop_id, v_shop_profile_id, v_shop_is_active
  FROM shops
  WHERE slug = p_slug;
  
  IF v_shop_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Vérifier la visibilité de la boutique
  v_is_shop_visible := is_shop_visible(v_shop_profile_id, v_shop_is_active);

  -- If product ID is provided → use its form_id, else use shop's custom form
  IF p_product_id IS NOT NULL THEN
    SELECT form_id INTO v_form_id
    FROM products
    WHERE id = p_product_id
    AND shop_id = v_shop_id
    AND is_active = TRUE;
  ELSE
    SELECT id INTO v_form_id
    FROM forms
    WHERE shop_id = v_shop_id
    AND is_custom_form = TRUE
    LIMIT 1;
  END IF;

  -- Calculate dates with limit reached (cast fix included)
  WITH future_dates AS (
    SELECT 
      (current_date + (gs * interval '1 day'))::date as check_date,
      extract(dow from (current_date + (gs * interval '1 day'))) as day_of_week
    FROM generate_series(0, 59) gs
  ),
  availability_days AS (
    SELECT day, daily_order_limit
    FROM availabilities
    WHERE shop_id = v_shop_id
    AND is_open = TRUE
    AND daily_order_limit IS NOT NULL
  ),
  future_dates_with_limits AS (
    SELECT 
      fd.check_date,
      ad.daily_order_limit
    FROM future_dates fd
    JOIN availability_days ad ON fd.day_of_week = ad.day
  ),
  order_counts AS (
    SELECT 
      fdl.check_date::text as pickup_date,
      count(o.id) as order_count,
      fdl.daily_order_limit
    FROM future_dates_with_limits fdl
    LEFT JOIN orders o ON o.shop_id = v_shop_id 
      AND o.pickup_date = fdl.check_date::date
      AND o.status IN ('pending', 'quoted', 'confirmed', 'ready', 'completed')
    GROUP BY fdl.check_date, fdl.daily_order_limit
  )
  SELECT array_agg(pickup_date)
  INTO v_dates_with_limit_reached
  FROM order_counts
  WHERE order_count >= daily_order_limit;

  -- Build JSON result
  SELECT json_build_object(
    'shop', (
      SELECT json_build_object(
        'id', s.id,
        'name', s.name,
        'bio', s.bio,
        'slug', s.slug,
        'logo_url', s.logo_url,
        'is_custom_accepted', s.is_custom_accepted,
        'is_active', s.is_active,
        'is_visible', v_is_shop_visible
      )
      FROM shops s
      WHERE s.id = v_shop_id
    ),
    'product', (
      CASE WHEN p_product_id IS NOT NULL THEN (
        SELECT json_build_object(
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
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.id = p_product_id
        AND p.shop_id = v_shop_id
        AND p.is_active = TRUE
      ) ELSE NULL END
    ),
    'customForm', (
      SELECT json_build_object(
        'id', f.id,
        'is_custom_form', f.is_custom_form,
        'title', f.title,
        'description', f.description
      )
      FROM forms f
      WHERE f.id = v_form_id
      AND f.shop_id = v_shop_id
    ),
    'customFields', (
      SELECT json_agg(
        json_build_object(
          'id', ff.id,
          'label', ff.label,
          'type', ff.type,
          'options', ff.options,
          'required', ff.required,
          'order', ff.order
        ) ORDER BY ff.order
      )
      FROM form_fields ff
      WHERE ff.form_id = v_form_id
    ),
    'availabilities', (
      SELECT json_agg(
        json_build_object(
          'day', a.day,
          'is_open', a.is_open,
          'daily_order_limit', a.daily_order_limit
        ) ORDER BY a.day
      )
      FROM availabilities a
      WHERE a.shop_id = v_shop_id
    ),
    'unavailabilities', (
      SELECT json_agg(
        json_build_object(
          'id', u.id,
          'start_date', u.start_date,
          'end_date', u.end_date
        ) ORDER BY u.start_date
      )
      FROM unavailabilities u
      WHERE u.shop_id = v_shop_id
      AND u.end_date >= current_date
    ),
    'datesWithLimitReached', v_dates_with_limit_reached
  )
  INTO result;
  
  RETURN result;
END;
$$;


-- Autoriser les utilisateurs authentifiés à exécuter la fonction unifiée
grant execute on function get_order_data(text, uuid) to authenticated;
