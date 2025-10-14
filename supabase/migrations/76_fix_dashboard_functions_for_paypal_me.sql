-- Migration 76: Fix dashboard functions for PayPal.me system
-- This migration updates the dashboard functions to work with the new PayPal.me system

-- ==============================================
-- 1. UPDATE GET_USER_PERMISSIONS FUNCTION
-- ==============================================

-- Supprimer et recréer get_user_permissions pour utiliser payment_links
DROP FUNCTION IF EXISTS get_user_permissions(UUID);
CREATE FUNCTION get_user_permissions(p_profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
    v_plan TEXT;
    v_product_count INTEGER;
    v_shop_id UUID;
    v_shop_slug TEXT;
BEGIN
    -- Get shop info
    SELECT s.id, s.slug
    INTO v_shop_id, v_shop_slug
    FROM shops s
    WHERE s.profile_id = p_profile_id;
    
    -- Get plan and product count
    v_plan := get_user_plan(p_profile_id, 'prod_Selcz36pAfV3vV', 'prod_Selbd3Ne2plHqG');
    v_product_count := get_product_count(p_profile_id);
    
    SELECT json_build_object(
        'shopId', v_shop_id,
        'shopSlug', v_shop_slug,
        'plan', v_plan,
        'productCount', v_product_count,
        'productLimit', CASE 
            WHEN v_plan = 'premium' THEN 999999
            WHEN v_plan = 'exempt' THEN 999999
            ELSE 10
        END,
        'canHandleCustomRequests', v_plan IN ('premium', 'exempt'),
        'canManageCustomForms', v_plan IN ('premium', 'exempt'),
        'canAddMoreProducts', v_product_count < CASE 
            WHEN v_plan = 'premium' THEN 999999
            WHEN v_plan = 'exempt' THEN 999999
            ELSE 10
        END,
        'needsSubscription', v_plan IS NULL,
        'isExempt', v_plan = 'exempt',
        'canAccessDashboard', v_plan IS NOT NULL,
        'has_payment_method', (
            SELECT COUNT(*) > 0
            FROM payment_links pl
            WHERE pl.profile_id = p_profile_id
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- ==============================================
-- 2. UPDATE GET_DASHBOARD_DATA FUNCTION
-- ==============================================

-- Supprimer et recréer get_dashboard_data pour utiliser le nouveau système
DROP FUNCTION IF EXISTS get_dashboard_data(UUID);
CREATE FUNCTION get_dashboard_data(p_profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'shop', (
            SELECT json_build_object(
                'id', s.id,
                'name', s.name,
                'slug', s.slug,
                'logo_url', s.logo_url,
                'is_custom_accepted', s.is_custom_accepted,
                'is_active', s.is_active
            )
            FROM shops s
            WHERE s.profile_id = p_profile_id
        ),
        'permissions', get_user_permissions(p_profile_id),
        'subscription', (
            SELECT json_build_object(
                'status', up.subscription_status,
                'stripe_subscription_id', up.stripe_subscription_id,
                'created_at', up.created_at
            )
            FROM user_products up
            WHERE up.profile_id = p_profile_id
            ORDER BY up.created_at DESC
            LIMIT 1
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- ==============================================
-- 3. UPDATE GET_ONBOARDING_DATA FUNCTION
-- ==============================================

-- Supprimer et recréer get_onboarding_data pour utiliser payment_links
DROP FUNCTION IF EXISTS get_onboarding_data(UUID);
CREATE FUNCTION get_onboarding_data(p_profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'shop', (
            SELECT json_build_object(
                'id', s.id,
                'name', s.name,
                'slug', s.slug,
                'logo_url', s.logo_url,
                'is_custom_accepted', s.is_custom_accepted,
                'is_active', s.is_active
            )
            FROM shops s
            WHERE s.profile_id = p_profile_id
            LIMIT 1
        ),
        'payment_link', (
            SELECT json_build_object(
                'id', pl.id,
                'paypal_me', pl.paypal_me,
                'created_at', pl.created_at
            )
            FROM payment_links pl
            WHERE pl.profile_id = p_profile_id
            LIMIT 1
        )
    ) INTO result;
    
    RETURN result;
END;
$$;

-- ==============================================
-- 4. UPDATE GET_ORDER_DETAILS FUNCTION
-- ==============================================

-- Supprimer et recréer get_order_details pour enlever les colonnes PayPal supprimées
DROP FUNCTION IF EXISTS get_order_details(UUID, UUID);
CREATE FUNCTION get_order_details(p_order_id UUID, p_profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'order', (
            SELECT json_build_object(
                'id', o.id,
                'customer_name', o.customer_name,
                'customer_email', o.customer_email,
                'pickup_date', o.pickup_date,
                'status', o.status,
                'total_amount', o.total_amount,
                'product_name', o.product_name,
                'additional_information', o.additional_information,
                'chef_message', o.chef_message,
                'created_at', o.created_at,
                'chef_pickup_date', o.chef_pickup_date,
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
$$;

-- ==============================================
-- 5. PERMISSIONS
-- ==============================================

-- Grant permissions to the functions
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO anon;

GRANT EXECUTE ON FUNCTION get_dashboard_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_data(UUID) TO anon;

GRANT EXECUTE ON FUNCTION get_onboarding_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_onboarding_data(UUID) TO anon;

GRANT EXECUTE ON FUNCTION get_order_details(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_details(UUID, UUID) TO anon;

-- ==============================================
-- 6. COMMENTS
-- ==============================================

COMMENT ON FUNCTION get_user_permissions(UUID) IS 'Get user permissions - updated for PayPal.me system';
COMMENT ON FUNCTION get_dashboard_data(UUID) IS 'Get dashboard data - updated for PayPal.me system';
COMMENT ON FUNCTION get_onboarding_data(UUID) IS 'Get onboarding data - updated for PayPal.me system';
COMMENT ON FUNCTION get_order_details(UUID, UUID) IS 'Get order details - updated to remove PayPal columns';
