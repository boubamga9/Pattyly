-- ==============================================
-- UPDATE ORDERS RPCs TO INCLUDE TIME SLOTS
-- ==============================================

-- 1. Mettre à jour le RPC get_orders_data pour inclure pickup_time et chef_pickup_time
DROP FUNCTION IF EXISTS get_orders_data(UUID);

CREATE OR REPLACE FUNCTION get_orders_data(
    p_profile_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_shop_id UUID;
    v_orders JSONB;
    v_shop JSONB;
BEGIN
    -- 1. Récupérer l'ID de la boutique
    SELECT id INTO v_shop_id
    FROM shops
    WHERE profile_id = p_profile_id;

    IF v_shop_id IS NULL THEN
        RETURN jsonb_build_object(
            'orders', '[]'::jsonb,
            'shop', 'null'::jsonb
        );
    END IF;

    -- 2. Récupérer les commandes avec les nouvelles colonnes temps
    SELECT jsonb_agg(
        jsonb_build_object(
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
            'chef_pickup_date', o.chef_pickup_date,
            'chef_pickup_time', o.chef_pickup_time,
            'created_at', o.created_at,
            'products', CASE 
                WHEN p.id IS NOT NULL THEN 
                    jsonb_build_object(
                        'name', p.name,
                        'image_url', p.image_url
                    )
                ELSE NULL
            END
        )
    ) INTO v_orders
    FROM orders o
    LEFT JOIN products p ON p.id = o.product_id
    WHERE o.shop_id = v_shop_id
    ORDER BY o.created_at DESC;

    -- 3. Récupérer les informations de la boutique
    SELECT jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'slug', s.slug
    ) INTO v_shop
    FROM shops s
    WHERE s.id = v_shop_id;

    -- 4. Retourner les données
    RETURN jsonb_build_object(
        'orders', COALESCE(v_orders, '[]'::jsonb),
        'shop', COALESCE(v_shop, 'null'::jsonb)
    );
END;
$$ LANGUAGE plpgsql;

-- 2. Mettre à jour le RPC get_order_detail_data pour inclure pickup_time et chef_pickup_time
DROP FUNCTION IF EXISTS get_order_detail_data(UUID, UUID);

CREATE OR REPLACE FUNCTION get_order_detail_data(
    p_order_id UUID,
    p_profile_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_shop_id UUID;
    v_order JSONB;
    v_personal_note JSONB;
    v_shop JSONB;
BEGIN
    -- 1. Récupérer l'ID de la boutique
    SELECT id INTO v_shop_id
    FROM shops
    WHERE profile_id = p_profile_id;

    IF v_shop_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- 2. Récupérer la commande avec les nouvelles colonnes temps
    SELECT jsonb_build_object(
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
        'chef_pickup_date', o.chef_pickup_date,
        'chef_pickup_time', o.chef_pickup_time,
        'created_at', o.created_at,
        'paid_amount', o.paid_amount,
        'order_ref', o.order_ref,
        'products', CASE 
            WHEN p.id IS NOT NULL THEN 
                jsonb_build_object(
                    'id', p.id,
                    'name', p.name,
                    'description', p.description,
                    'base_price', p.base_price,
                    'image_url', p.image_url
                )
            ELSE NULL
        END,
        'customization_data', o.customization_data,
        'inspiration_photos', o.inspiration_photos
    ) INTO v_order
    FROM orders o
    LEFT JOIN products p ON p.id = o.product_id
    WHERE o.id = p_order_id 
    AND o.shop_id = v_shop_id;

    IF v_order IS NULL THEN
        RETURN NULL;
    END IF;

    -- 3. Récupérer la note personnelle
    SELECT jsonb_build_object(
        'note', pon.note,
        'updated_at', pon.updated_at
    ) INTO v_personal_note
    FROM personal_order_notes pon
    WHERE pon.order_id = p_order_id 
    AND pon.shop_id = v_shop_id;

    -- 4. Récupérer les informations de la boutique
    SELECT jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'slug', s.slug
    ) INTO v_shop
    FROM shops s
    WHERE s.id = v_shop_id;

    -- 5. Retourner les données
    RETURN jsonb_build_object(
        'order', v_order,
        'personalNote', v_personal_note,
        'shop', v_shop
    );
END;
$$ LANGUAGE plpgsql;
