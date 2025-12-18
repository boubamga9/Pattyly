-- Fix functions that still reference af.email in anti_fraud table
-- Update them to use merchant_id instead

-- Fix get_onboarding_data function
CREATE OR REPLACE FUNCTION get_onboarding_data(p_profile_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  result json;
begin
  select json_build_object(
    'has_shop', (
      select count(*) > 0
      from shops s
      where s.profile_id = p_profile_id
    ),
    'has_paypal', (
      select count(*) > 0
      from paypal_accounts pa
      where pa.profile_id = p_profile_id
      and pa.is_active = true
    ),
    'has_subscription', (
      select count(*) > 0
      from user_products up
      where up.profile_id = p_profile_id
    ),
    'is_anti_fraud', (
      select count(*) > 0
      from paypal_accounts pa
      join anti_fraud af on af.merchant_id = pa.paypal_merchant_id
      where pa.profile_id = p_profile_id
    )
  ) into result;
  
  return result;
end;
$$;

-- Fix get_user_plan_and_product_count function
CREATE OR REPLACE FUNCTION get_user_plan_and_product_count(p_profile_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
declare
  result json;
begin
  select json_build_object(
    'plan', (
      select up.subscription_status
      from user_products up
      where up.profile_id = p_profile_id
    ),
    'product_count', (
      select count(*)
      from products p
      where p.profile_id = p_profile_id
      and p.is_active = true
    ),
    'is_anti_fraud', (
      select count(*) > 0
      from paypal_accounts pa
      join anti_fraud af on af.merchant_id = pa.paypal_merchant_id
      where pa.profile_id = p_profile_id
    )
  ) into result;
  
  return result;
end;
$$;

-- Grant execute permissions
grant execute on function get_onboarding_data(uuid) to authenticated;
grant execute on function get_user_plan_and_product_count(uuid) to authenticated;

-- Add comments
COMMENT ON FUNCTION get_onboarding_data(uuid) IS 'Get onboarding status - updated to use merchant_id for anti-fraud check';
COMMENT ON FUNCTION get_user_plan_and_product_count(uuid) IS 'Get user plan and product count - updated to use merchant_id for anti-fraud check';
