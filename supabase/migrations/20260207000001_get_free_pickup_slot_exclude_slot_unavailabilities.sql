-- Exclude slots that fall within slot_unavailabilities for the pickup date.
CREATE OR REPLACE FUNCTION "public"."get_free_pickup_slot"(
    "p_shop_id" "uuid",
    "p_pickup_date" "date",
    "p_start_time" time without time zone,
    "p_end_time" time without time zone,
    "p_interval_time" interval,
    "p_break_start_time" time without time zone DEFAULT NULL,
    "p_break_end_time" time without time zone DEFAULT NULL
) RETURNS "text"[]
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
DECLARE
    v_slot TIME;
    v_end TIME;
    v_allow BOOLEAN := FALSE;
    v_all_slots TEXT[] := ARRAY[]::TEXT[];
    v_reserved_slots TEXT[] := ARRAY[]::TEXT[];
    v_free_slots TEXT[] := ARRAY[]::TEXT[];
BEGIN
    IF p_start_time IS NULL OR p_end_time IS NULL OR p_interval_time IS NULL THEN
        RETURN ARRAY[]::TEXT[];
    END IF;

    -- First segment: start_time -> break_start (or end_time if no break)
    v_slot := p_start_time;
    IF p_break_start_time IS NOT NULL AND p_break_end_time IS NOT NULL THEN
        v_end := LEAST(p_break_start_time, p_end_time);
    ELSE
        v_end := p_end_time;
    END IF;

    WHILE v_slot < v_end LOOP
        v_all_slots := array_append(v_all_slots, v_slot::TEXT);
        v_slot := v_slot + p_interval_time;
    END LOOP;

    -- Second segment (only if break is set): break_end -> end_time
    IF p_break_start_time IS NOT NULL AND p_break_end_time IS NOT NULL AND p_break_end_time < p_end_time THEN
        v_slot := p_break_end_time;
        v_end := p_end_time;
        WHILE v_slot < v_end LOOP
            v_all_slots := array_append(v_all_slots, v_slot::TEXT);
            v_slot := v_slot + p_interval_time;
        END LOOP;
    END IF;

    -- Exclude slots that fall inside any slot_unavailability for this date (creneau exclu si debut dans [start_time, end_time[)
    SELECT array_agg(s.slot) INTO v_all_slots
    FROM unnest(v_all_slots) AS s(slot)
    WHERE s.slot IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM slot_unavailabilities su
          WHERE su.shop_id = p_shop_id
            AND su.unavailable_date = p_pickup_date
            AND (s.slot)::time >= su.start_time
            AND (s.slot)::time < su.end_time
      );

    -- If shop allows multiple pickups per slot, return remaining slots (no filtering by reserved).
    SELECT COALESCE(sh.allow_multiple_pickups_per_slot, false) INTO v_allow
    FROM shops sh
    WHERE sh.id = p_shop_id;

    IF v_allow THEN
        RETURN COALESCE(v_all_slots, ARRAY[]::TEXT[]);
    END IF;

    -- Reserved slots from orders
    SELECT array_agg(o.pickup_time::TEXT) INTO v_reserved_slots
    FROM orders o
    WHERE o.shop_id = p_shop_id
      AND o.pickup_date = p_pickup_date
      AND o.pickup_time IS NOT NULL
      AND o.status IN ('pending', 'quoted', 'confirmed', 'to_verify');

    SELECT array_cat(
        COALESCE(v_reserved_slots, ARRAY[]::TEXT[]),
        COALESCE(array_agg((po.order_data->>'pickup_time')::TEXT), ARRAY[]::TEXT[])
    ) INTO v_reserved_slots
    FROM pending_orders po
    WHERE (po.order_data->>'shop_id')::UUID = p_shop_id
      AND (po.order_data->>'pickup_date')::DATE = p_pickup_date
      AND po.order_data->>'pickup_time' IS NOT NULL;

    SELECT array_agg(slot) INTO v_free_slots
    FROM unnest(COALESCE(v_all_slots, ARRAY[]::TEXT[])) AS slot
    WHERE slot IS NOT NULL
      AND slot NOT IN (SELECT unnest(COALESCE(v_reserved_slots, ARRAY[]::TEXT[])));

    RETURN COALESCE(v_free_slots, ARRAY[]::TEXT[]);
END;
$$;

ALTER FUNCTION "public"."get_free_pickup_slot"("p_shop_id" "uuid", "p_pickup_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_interval_time" interval, "p_break_start_time" time without time zone, "p_break_end_time" time without time zone) OWNER TO "postgres";

GRANT ALL ON FUNCTION "public"."get_free_pickup_slot"("p_shop_id" "uuid", "p_pickup_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_interval_time" interval, "p_break_start_time" time without time zone, "p_break_end_time" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_free_pickup_slot"("p_shop_id" "uuid", "p_pickup_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_interval_time" interval, "p_break_start_time" time without time zone, "p_break_end_time" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_free_pickup_slot"("p_shop_id" "uuid", "p_pickup_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_interval_time" interval, "p_break_start_time" time without time zone, "p_break_end_time" time without time zone) TO "service_role";
