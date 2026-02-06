-- 1) get_availability_data: include break_start_time and break_end_time in the returned JSON.
CREATE OR REPLACE FUNCTION "public"."get_availability_data"("p_profile_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
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
                    'interval_time', a.interval_time,
                    'break_start_time', a.break_start_time,
                    'break_end_time', a.break_end_time
                )
            )
            FROM (
                SELECT a.id, a.day, a.is_open, a.daily_order_limit, a.start_time, a.end_time, a.interval_time,
                       a.break_start_time, a.break_end_time
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
$$;

-- 2) get_free_pickup_slot: add optional break period; generate slots only outside the break.
-- When p_break_start_time and p_break_end_time are both NOT NULL, slots are generated
-- from p_start_time to p_break_start_time and from p_break_end_time to p_end_time.
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
    FROM unnest(v_all_slots) AS slot
    WHERE slot IS NOT NULL
      AND slot NOT IN (SELECT unnest(COALESCE(v_reserved_slots, ARRAY[]::TEXT[])));

    RETURN COALESCE(v_free_slots, ARRAY[]::TEXT[]);
END;
$$;

ALTER FUNCTION "public"."get_availability_data"("p_profile_id" "uuid") OWNER TO "postgres";
ALTER FUNCTION "public"."get_free_pickup_slot"("p_shop_id" "uuid", "p_pickup_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_interval_time" interval, "p_break_start_time" time without time zone, "p_break_end_time" time without time zone) OWNER TO "postgres";

-- Keep grants for anon/authenticated/service_role (re-grant on replaced function)
GRANT ALL ON FUNCTION "public"."get_free_pickup_slot"("p_shop_id" "uuid", "p_pickup_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_interval_time" interval, "p_break_start_time" time without time zone, "p_break_end_time" time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_free_pickup_slot"("p_shop_id" "uuid", "p_pickup_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_interval_time" interval, "p_break_start_time" time without time zone, "p_break_end_time" time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_free_pickup_slot"("p_shop_id" "uuid", "p_pickup_date" "date", "p_start_time" time without time zone, "p_end_time" time without time zone, "p_interval_time" interval, "p_break_start_time" time without time zone, "p_break_end_time" time without time zone) TO "service_role";
