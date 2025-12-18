-- Migration: Add overload for get_order_data with p_shop_id parameter
-- This allows calling get_order_data directly with shop_id instead of slug

-- Add overload: get_order_data(p_shop_id UUID)
CREATE OR REPLACE FUNCTION get_order_data(p_shop_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    v_slug TEXT;
    v_form_id UUID;
    v_dates_with_limit_reached TEXT[];
BEGIN
    -- Get shop slug from shop_id
    SELECT slug INTO v_slug
    FROM shops
    WHERE id = p_shop_id AND is_active = true;
    
    IF v_slug IS NULL THEN
        RETURN NULL;
    END IF;

    -- Use the existing get_order_data function with slug
    -- This maintains consistency and avoids code duplication
    SELECT get_order_data(v_slug, NULL) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_order_data(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_order_data(UUID) IS 'Get order data by shop_id - overload that calls the main function with slug';



