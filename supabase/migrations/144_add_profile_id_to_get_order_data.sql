-- Migration: Add profile_id to shop object in get_order_data function
-- Description: Add profile_id to shop object so order limit checks can work

CREATE OR REPLACE FUNCTION get_order_data(p_slug TEXT, p_product_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result JSON;
    v_shop_id UUID;
    v_form_id UUID;
    v_dates_with_limit_reached TEXT[];
BEGIN
    -- Get shop ID
    SELECT id INTO v_shop_id
    FROM shops
    WHERE slug = p_slug AND is_active = true;
    
    IF v_shop_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- If product ID is provided → use its form_id, else use shop's custom form
    IF p_product_id IS NOT NULL THEN
        SELECT form_id INTO v_form_id
        FROM products
        WHERE id = p_product_id
        AND shop_id = v_shop_id
        AND is_active = true;
    ELSE
        SELECT id INTO v_form_id
        FROM forms
        WHERE shop_id = v_shop_id
        AND is_custom_form = true
        LIMIT 1;
    END IF;

    -- Calculate dates with limit reached (cast fix included)
    WITH future_dates AS (
        SELECT 
            (current_date + (gs * interval '1 day'))::date AS check_date,
            extract(dow FROM (current_date + (gs * interval '1 day'))) AS day_of_week
        FROM generate_series(0, 59) gs
    ),
    availability_days AS (
        SELECT day, daily_order_limit
        FROM availabilities
        WHERE shop_id = v_shop_id
        AND is_open = true
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
            fdl.check_date::text AS pickup_date,
            count(o.id) AS order_count,
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
                'profile_id', s.profile_id,
                'instagram', s.instagram,
                'tiktok', s.tiktok,
                'website', s.website,
                'is_custom_accepted', s.is_custom_accepted,
                'is_active', s.is_active,
                'is_visible', s.is_active
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
                    'shop_id', p.shop_id,
                    'category', json_build_object(
                        'id', c.id,
                        'name', c.name
                    )
                )
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                WHERE p.id = p_product_id
                AND p.shop_id = v_shop_id
                AND p.is_active = true
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
                    'daily_order_limit', a.daily_order_limit,
                    'start_time', a.start_time,
                    'end_time', a.end_time,
                    'interval_time', a.interval_time
                ) ORDER BY a.day
            )
            FROM availabilities a
            WHERE a.shop_id = v_shop_id
        ),
        'unavailabilities', (
            SELECT json_agg(
                json_build_object(
                    'id', ua.id,
                    'start_date', ua.start_date,
                    'end_date', ua.end_date
                ) ORDER BY ua.start_date
            )
            FROM unavailabilities ua
            WHERE ua.shop_id = v_shop_id
            AND ua.end_date >= current_date
        ),
        'datesWithLimitReached', COALESCE(v_dates_with_limit_reached, ARRAY[]::TEXT[])
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

