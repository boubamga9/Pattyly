-- Migration: Update get_availability_data to include time slot columns
-- Description: Add start_time, end_time, and interval_time to the availabilities data

-- Update the get_availability_data function to include time slot columns
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
