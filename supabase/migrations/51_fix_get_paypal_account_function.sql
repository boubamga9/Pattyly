-- Migration: Fix get_paypal_account_for_shop function
-- Description: Remove paypal_email from function return as the column was removed in migration 50

-- Drop the old function
DROP FUNCTION IF EXISTS get_paypal_account_for_shop(UUID);

-- Recreate the function without paypal_email
CREATE OR REPLACE FUNCTION get_paypal_account_for_shop(shop_uuid UUID)
RETURNS TABLE (
    paypal_merchant_id TEXT,
    is_active BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.paypal_merchant_id,
        pa.is_active
    FROM paypal_accounts pa
    INNER JOIN shops s ON s.profile_id = pa.profile_id
    WHERE s.id = shop_uuid
      AND pa.is_active = true
      AND pa.onboarding_status = 'completed'
      AND pa.paypal_merchant_id IS NOT NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_paypal_account_for_shop(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_paypal_account_for_shop(UUID) TO anon;

-- Add comment
COMMENT ON FUNCTION get_paypal_account_for_shop(UUID) IS 'Get active PayPal account info for a shop (for payment processing)';

