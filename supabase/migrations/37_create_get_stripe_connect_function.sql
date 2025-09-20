-- Create a secure function to get Stripe Connect account for payment processing
-- This allows the API to access stripe_connect_accounts without exposing RLS policies

CREATE OR REPLACE FUNCTION public.get_stripe_connect_for_shop(shop_uuid UUID)
RETURNS TABLE(stripe_account_id TEXT, is_active BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT sca.stripe_account_id, sca.is_active
  FROM stripe_connect_accounts sca
  JOIN shops s ON s.profile_id = sca.profile_id
  WHERE s.id = shop_uuid
    AND s.is_active = true
    AND sca.is_active = true;
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_stripe_connect_for_shop(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_stripe_connect_for_shop(UUID) TO anon;
