-- ==============================================
-- ADD TIME SLOTS TO AVAILABILITIES AND ORDERS
-- ==============================================

-- 1. Ajouter les colonnes temps à la table availabilities
ALTER TABLE availabilities 
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME,
ADD COLUMN interval_time INTERVAL;

-- 2. Ajouter les colonnes temps à la table orders
ALTER TABLE orders 
ADD COLUMN pickup_time TIME,
ADD COLUMN chef_pickup_time TIME;

-- 3. Ajouter les colonnes temps à la table pending_orders (pour les commandes en attente)
ALTER TABLE pending_orders 
ADD COLUMN pickup_time TIME;

-- 4. Mettre à jour le RPC get_order_data pour inclure les nouvelles colonnes availabilities
DROP FUNCTION IF EXISTS get_order_data(TEXT, UUID);

CREATE OR REPLACE FUNCTION get_order_data(
    p_slug TEXT,
    p_product_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_shop_data JSONB;
    v_product_data JSONB;
    v_form_data JSONB;
    v_fields_data JSONB;
    v_availabilities_data JSONB;
    v_unavailabilities_data JSONB;
    v_dates_with_limit_reached TEXT[];
BEGIN
    -- 1. Récupérer les données de la boutique avec is_visible
    SELECT to_jsonb(s) INTO v_shop_data
    FROM (
        SELECT 
            s.id,
            s.name,
            s.bio,
            s.slug,
            s.logo_url,
            s.instagram,
            s.tiktok,
            s.website,
            s.is_custom_accepted,
            s.is_active,
            s.is_active as is_visible
        FROM shops s
        WHERE s.slug = p_slug
    ) s;

    -- Si pas de boutique, retourner null
    IF v_shop_data IS NULL THEN
        RETURN NULL;
    END IF;

    -- 2. Récupérer les données du produit (si spécifié)
    IF p_product_id IS NOT NULL THEN
        SELECT to_jsonb(p) INTO v_product_data
        FROM (
            SELECT 
                p.id,
                p.name,
                p.description,
                p.base_price,
                p.image_url,
                p.min_days_notice,
                p.category_id,
                p.form_id
            FROM products p
            WHERE p.id = p_product_id 
            AND p.shop_id = (v_shop_data->>'id')::UUID
            AND p.is_active = true
        ) p;
    END IF;

    -- 3. Récupérer les données du formulaire personnalisé (si produit spécifié)
    IF p_product_id IS NOT NULL AND v_product_data IS NOT NULL THEN
        -- Récupérer le formulaire
        SELECT to_jsonb(f) INTO v_form_data
        FROM (
            SELECT id, title, description
            FROM forms f
            WHERE f.id = (v_product_data->>'form_id')::UUID
        ) f;

        -- Récupérer les champs du formulaire
        SELECT jsonb_agg(to_jsonb(ff)) INTO v_fields_data
        FROM (
            SELECT id, label, type, options, required, "order"
            FROM form_fields ff
            WHERE ff.form_id = (v_product_data->>'form_id')::UUID
            ORDER BY "order"
        ) ff;
    END IF;

    -- 4. Récupérer les disponibilités avec les nouveaux champs temps
    SELECT jsonb_agg(to_jsonb(a)) INTO v_availabilities_data
    FROM (
        SELECT day, daily_order_limit, start_time, end_time, interval_time
        FROM availabilities a
        WHERE a.shop_id = (v_shop_data->>'id')::UUID
        ORDER BY day
    ) a;

    -- 5. Récupérer les indisponibilités
    SELECT jsonb_agg(to_jsonb(u)) INTO v_unavailabilities_data
    FROM (
        SELECT start_date, end_date
        FROM unavailabilities u
        WHERE u.shop_id = (v_shop_data->>'id')::UUID
        AND u.end_date >= CURRENT_DATE
        ORDER BY start_date
    ) u;

    -- 6. Calculer les dates où la limite quotidienne est atteinte
    WITH daily_orders AS (
        SELECT 
            o.pickup_date,
            COUNT(*) as order_count,
            a.daily_order_limit
        FROM orders o
        LEFT JOIN availabilities a ON a.shop_id = o.shop_id 
            AND a.day = EXTRACT(DOW FROM o.pickup_date::DATE)
        WHERE o.shop_id = (v_shop_data->>'id')::UUID
        AND o.pickup_date >= CURRENT_DATE
        AND o.status IN ('pending', 'quoted', 'confirmed')
        GROUP BY o.pickup_date, a.daily_order_limit
    )
    SELECT array_agg(pickup_date::TEXT) INTO v_dates_with_limit_reached
    FROM daily_orders
    WHERE daily_order_limit IS NOT NULL 
    AND order_count >= daily_order_limit;

    -- 7. Construire la réponse finale
    RETURN jsonb_build_object(
        'shop', v_shop_data,
        'product', v_product_data,
        'customForm', v_form_data,
        'customFields', COALESCE(v_fields_data, '[]'::jsonb),
        'availabilities', COALESCE(v_availabilities_data, '[]'::jsonb),
        'unavailabilities', COALESCE(v_unavailabilities_data, '[]'::jsonb),
        'datesWithLimitReached', COALESCE(v_dates_with_limit_reached, ARRAY[]::TEXT[])
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Créer le RPC get_free_pickup_slot
CREATE OR REPLACE FUNCTION get_free_pickup_slot(
    p_shop_id UUID,
    p_pickup_date DATE,
    p_start_time TIME,
    p_end_time TIME,
    p_interval_time INTERVAL
)
RETURNS TEXT[] AS $$
DECLARE
    v_slot TIME;
    v_end_time TIME;
    v_all_slots TEXT[] := ARRAY[]::TEXT[];
    v_reserved_slots TEXT[] := ARRAY[]::TEXT[];
    v_free_slots TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Vérifier que les paramètres sont valides
    IF p_start_time IS NULL OR p_end_time IS NULL OR p_interval_time IS NULL THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    -- Générer tous les créneaux possibles
    v_slot := p_start_time;
    v_end_time := p_end_time;
    
    WHILE v_slot < v_end_time LOOP
        v_all_slots := array_append(v_all_slots, v_slot::TEXT);
        v_slot := v_slot + p_interval_time;
    END LOOP;

    -- Récupérer les créneaux déjà réservés pour cette date
    SELECT array_agg(o.pickup_time::TEXT) INTO v_reserved_slots
    FROM orders o
    WHERE o.shop_id = p_shop_id
    AND o.pickup_date = p_pickup_date
    AND o.pickup_time IS NOT NULL
    AND o.status IN ('pending', 'quoted', 'confirmed', 'to_verify');

    -- Ajouter aussi les pending_orders
    SELECT array_cat(
        COALESCE(v_reserved_slots, ARRAY[]::TEXT[]),
        array_agg(po.pickup_time::TEXT)
    ) INTO v_reserved_slots
    FROM pending_orders po
    WHERE (po.order_data->>'shop_id')::UUID = p_shop_id
    AND (po.order_data->>'pickup_date')::DATE = p_pickup_date
    AND po.pickup_time IS NOT NULL;

    -- Filtrer les créneaux libres
    SELECT array_agg(slot) INTO v_free_slots
    FROM unnest(v_all_slots) AS slot
    WHERE slot NOT IN (
        SELECT unnest(COALESCE(v_reserved_slots, ARRAY[]::TEXT[]))
    );

    RETURN COALESCE(v_free_slots, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;
