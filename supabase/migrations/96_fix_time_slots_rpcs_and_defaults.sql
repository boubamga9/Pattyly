-- Migration: Fix time slots RPCs and default values
-- Description: Fix all RPC functions to include time slot columns and set default values

-- 1. Drop and recreate get_order_data to include time slot columns in availabilities
DROP FUNCTION IF EXISTS get_order_data(TEXT, UUID);
DROP FUNCTION IF EXISTS get_order_data(TEXT);

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
$$ LANGUAGE plpgsql;

-- 2. Drop and recreate get_availability_data to include time slot columns
DROP FUNCTION IF EXISTS get_availability_data(UUID);

CREATE OR REPLACE FUNCTION get_availability_data(p_profile_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'availabilities', (
            SELECT json_agg(
                json_build_object(
                    'id', a.id,
                    'day', a.day,
                    'is_open', a.is_open,
                    'daily_order_limit', a.daily_order_limit,
                    'start_time', a.start_time,
                    'end_time', a.end_time,
                    'interval_time', a.interval_time
                )
            )
            FROM (
                SELECT a.id, a.day, a.is_open, a.daily_order_limit, a.start_time, a.end_time, a.interval_time
                FROM availabilities a
                JOIN shops s ON s.id = a.shop_id
                WHERE s.profile_id = p_profile_id
                ORDER BY a.day
            ) a
        ),
        'unavailabilities', (
            SELECT json_agg(
                json_build_object(
                    'id', u.id,
                    'start_date', u.start_date,
                    'end_date', u.end_date
                )
            )
            FROM (
                SELECT u.id, u.start_date, u.end_date
                FROM unavailabilities u
                JOIN shops s ON s.id = u.shop_id
                WHERE s.profile_id = p_profile_id
                AND u.end_date >= current_date
                ORDER BY u.start_date
            ) u
        ),
        'shopId', (
            SELECT s.id
            FROM shops s
            WHERE s.profile_id = p_profile_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop and recreate get_orders_data to include time slot columns
DROP FUNCTION IF EXISTS get_orders_data(UUID);

CREATE OR REPLACE FUNCTION get_orders_data(p_profile_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'orders', (
            SELECT json_agg(
                json_build_object(
                    'id', o.id,
                    'customer_name', o.customer_name,
                    'customer_email', o.customer_email,
                    'pickup_date', o.pickup_date,
                    'pickup_time', o.pickup_time,
                    'status', o.status,
                    'total_amount', o.total_amount,
                    'product_name', o.product_name,
                    'additional_information', o.additional_information,
                    'chef_message', o.chef_message,
                    'created_at', o.created_at,
                    'chef_pickup_date', o.chef_pickup_date,
                    'chef_pickup_time', o.chef_pickup_time,
                    'product', json_build_object(
                        'name', p.name,
                        'image_url', p.image_url
                    )
                )
            )
            FROM (
                SELECT o.id, o.customer_name, o.customer_email, o.pickup_date, o.pickup_time, o.status, o.total_amount, o.product_name, o.additional_information, o.chef_message, o.created_at, o.chef_pickup_date, o.chef_pickup_time, o.product_id
                FROM orders o
                JOIN shops s ON s.id = o.shop_id
                WHERE s.profile_id = p_profile_id
                ORDER BY o.pickup_date ASC
            ) o
            LEFT JOIN products p ON p.id = o.product_id
        ),
        'shop', (
            SELECT json_build_object(
                'id', s.id,
                'name', s.name,
                'slug', s.slug
            )
            FROM shops s
            WHERE s.profile_id = p_profile_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Drop and recreate get_order_detail_data to include time slot columns
DROP FUNCTION IF EXISTS get_order_detail_data(UUID, UUID);

CREATE OR REPLACE FUNCTION get_order_detail_data(p_order_id UUID, p_profile_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'order', (
            SELECT json_build_object(
                'id', o.id,
                'customer_name', o.customer_name,
                'customer_email', o.customer_email,
                'customer_phone', o.customer_phone,
                'customer_instagram', o.customer_instagram,
                'pickup_date', o.pickup_date,
                'pickup_time', o.pickup_time,
                'status', o.status,
                'total_amount', o.total_amount,
                'product_name', o.product_name,
                'additional_information', o.additional_information,
                'chef_message', o.chef_message,
                'created_at', o.created_at,
                'chef_pickup_date', o.chef_pickup_date,
                'chef_pickup_time', o.chef_pickup_time,
                'paid_amount', o.paid_amount,
                'order_ref', o.order_ref,
                'customization_data', o.customization_data,
                'inspiration_photos', o.inspiration_photos,
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
            FROM orders o
            LEFT JOIN products p ON p.id = o.product_id
            JOIN shops s ON s.id = o.shop_id
            WHERE o.id = p_order_id
            AND s.profile_id = p_profile_id
        ),
        'personalNote', (
            SELECT json_build_object(
                'note', pon.note,
                'updated_at', pon.updated_at
            )
            FROM personal_order_notes pon
            JOIN shops s ON s.id = pon.shop_id
            WHERE pon.order_id = p_order_id
            AND s.profile_id = p_profile_id
        ),
        'shop', (
            SELECT json_build_object(
                'id', s.id,
                'name', s.name,
                'slug', s.slug
            )
            FROM shops s
            WHERE s.profile_id = p_profile_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Drop and recreate create_shop_with_availabilities to include default time slots and daily limit
DROP FUNCTION IF EXISTS create_shop_with_availabilities(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_shop_with_availabilities(
    p_profile_id UUID,
    p_name TEXT,
    p_bio TEXT,
    p_slug TEXT,
    p_logo_url TEXT,
    p_instagram TEXT,
    p_tiktok TEXT,
    p_website TEXT
)
RETURNS JSON AS $$
DECLARE
    shop_id UUID;
    result JSON;
BEGIN
    -- Insert shop
    INSERT INTO shops (
        profile_id, name, bio, slug, logo_url, 
        instagram, tiktok, website
    ) VALUES (
        p_profile_id, p_name, p_bio, p_slug, p_logo_url,
        p_instagram, p_tiktok, p_website
    ) RETURNING id INTO shop_id;
    
    -- Insert default availabilities (all days) with time slots and daily limit
    INSERT INTO availabilities (
        shop_id, 
        day, 
        is_open, 
        daily_order_limit,
        start_time,
        end_time,
        interval_time
    )
    SELECT 
        shop_id, 
        day, 
        (day >= 1 AND day <= 5) AS is_open,
        2 AS daily_order_limit,
        '09:00'::TIME AS start_time,
        '18:00'::TIME AS end_time,
        '01:00:00'::INTERVAL AS interval_time
    FROM generate_series(0, 6) AS day;
    
    -- Return shop data
    SELECT json_build_object(
        'id', s.id,
        'name', s.name,
        'bio', s.bio,
        'slug', s.slug,
        'logo_url', s.logo_url,
        'instagram', s.instagram,
        'tiktok', s.tiktok,
        'website', s.website
    ) INTO result
    FROM shops s
    WHERE s.id = shop_id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Update existing availabilities with default values
UPDATE availabilities 
SET 
    daily_order_limit = COALESCE(daily_order_limit, 2),
    start_time = COALESCE(start_time, '09:00'::TIME),
    end_time = COALESCE(end_time, '18:00'::TIME),
    interval_time = COALESCE(interval_time, '01:00:00'::INTERVAL)
WHERE start_time IS NULL 
   OR end_time IS NULL 
   OR interval_time IS NULL 
   OR daily_order_limit IS NULL;
