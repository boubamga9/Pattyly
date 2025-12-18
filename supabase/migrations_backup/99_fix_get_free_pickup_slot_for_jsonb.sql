-- Fix get_free_pickup_slot to use pickup_time from order_data JSONB instead of separate column

-- Drop and recreate the function
DROP FUNCTION IF EXISTS get_free_pickup_slot(UUID, DATE, TIME, TIME, INTERVAL);

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

    -- Récupérer les créneaux déjà réservés pour cette date depuis orders
    SELECT array_agg(o.pickup_time::TEXT) INTO v_reserved_slots
    FROM orders o
    WHERE o.shop_id = p_shop_id
    AND o.pickup_date = p_pickup_date
    AND o.pickup_time IS NOT NULL
    AND o.status IN ('pending', 'quoted', 'confirmed', 'to_verify');

    -- Ajouter aussi les pending_orders en utilisant pickup_time depuis order_data JSONB
    SELECT array_cat(
        COALESCE(v_reserved_slots, ARRAY[]::TEXT[]),
        array_agg((po.order_data->>'pickup_time')::TEXT)
    ) INTO v_reserved_slots
    FROM pending_orders po
    WHERE (po.order_data->>'shop_id')::UUID = p_shop_id
    AND (po.order_data->>'pickup_date')::DATE = p_pickup_date
    AND po.order_data->>'pickup_time' IS NOT NULL;

    -- Filtrer les créneaux libres
    SELECT array_agg(slot) INTO v_free_slots
    FROM unnest(v_all_slots) AS slot
    WHERE slot NOT IN (
        SELECT unnest(COALESCE(v_reserved_slots, ARRAY[]::TEXT[]))
    );

    RETURN COALESCE(v_free_slots, ARRAY[]::TEXT[]);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_free_pickup_slot(UUID, DATE, TIME, TIME, INTERVAL) TO authenticated;
