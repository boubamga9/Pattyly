-- Migration: Update create_shop_with_availabilities to include default time slots and daily limit
-- Description: Set default values for start_time (09:00), end_time (18:00), interval_time (01:00:00), and daily_order_limit (2)

-- Update the create_shop_with_availabilities function to include time slots and daily limit
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
